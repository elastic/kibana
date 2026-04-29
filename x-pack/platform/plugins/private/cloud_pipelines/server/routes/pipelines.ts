/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { API_PIPELINES, API_TENANT } from '../../common';
import type { CloudPipelinesConfig } from '../config';

/**
 * Proxies read-only requests to the pipelines-config backend service.
 * Writes happen automatically via the streams watcher; users never push
 * configs by hand. Deletion is exposed for operational clean-up.
 */
export const registerPipelineRoutes = (
  router: IRouter,
  config: CloudPipelinesConfig,
  logger: Logger
) => {
  const baseUrl = config.pipelinesConfigEndpoint;
  const { targetType, targetId } = config;

  router.get(
    {
      path: API_TENANT,
      validate: false,
      access: 'public',
      security: { authz: { enabled: false, reason: 'Returns tenant identity from server config' } },
    },
    async (_context, _request, response) => {
      return response.ok({ body: { targetType, targetId } });
    }
  );

  router.get(
    {
      path: API_PIPELINES,
      validate: false,
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'Delegates authorization to the upstream pipelines-config service',
        },
      },
    },
    async (_context, _request, response) => {
      try {
        const res = await fetch(`${baseUrl}/pipelines/${targetType}/${targetId}`);
        if (res.status === 404) {
          return response.ok({ body: { exists: false } });
        }
        const data = (await res.json()) as { pipeline_hash?: string; config?: string };
        return response.ok({
          body: {
            exists: true,
            pipelineHash: data.pipeline_hash,
            config: data.config ?? '',
          },
        });
      } catch (err) {
        logger.error(`Failed to get pipeline ${targetType}/${targetId}: ${err}`);
        return response.customError({ statusCode: 502, body: 'Backend unreachable' });
      }
    }
  );

  router.delete(
    {
      path: API_PIPELINES,
      validate: false,
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'Delegates authorization to the upstream pipelines-config service',
        },
      },
    },
    async (_context, _request, response) => {
      try {
        const res = await fetch(`${baseUrl}/pipelines/${targetType}/${targetId}`, {
          method: 'DELETE',
        });
        if (res.status === 404) {
          return response.notFound();
        }
        return response.ok({ body: { deleted: true } });
      } catch (err) {
        logger.error(`Failed to delete pipeline ${targetType}/${targetId}: ${err}`);
        return response.customError({ statusCode: 502, body: 'Backend unreachable' });
      }
    }
  );
};
