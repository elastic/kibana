/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z, lazySchema } from '@kbn/zod/v4';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { enforceEntityStorePrivileges } from './utils/check_entity_store_privileges';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../types';
import { wrapMiddlewares } from '../middleware';

const UPDATE_API_KEY_AUDIT_ACTION = 'entity_store_update_task_api_keys';

const bodySchema = lazySchema(() => z.object({}));

type UpdateApiKeyRequestBody = z.infer<typeof bodySchema>;

export async function handleUpdateApiKey(
  ctx: EntityStoreRequestHandlerContext,
  req: KibanaRequest<unknown, unknown, UpdateApiKeyRequestBody>,
  res: KibanaResponseFactory
): Promise<IKibanaResponse> {
  const { logger, assetManagerClient: assetManager } = await ctx.entityStore;
  const {
    security: {
      audit: { logger: auditLogger },
    },
  } = await ctx.core;
  logger.debug('Update API key API invoked');

  const audit = (outcome: 'success' | 'failure', labels?: Record<string, number>) =>
    auditLogger.log({
      message:
        outcome === 'success'
          ? 'User re-granted the API key of the Entity Store tasks'
          : 'User failed to re-grant the API key of the Entity Store tasks',
      event: {
        action: UPDATE_API_KEY_AUDIT_ACTION,
        category: ['configuration'],
        type: ['change'],
        outcome,
      },
      labels,
    });

  try {
    // The tasks run with the privileges of whoever calls this, so require what install requires
    const forbidden = await enforceEntityStorePrivileges(
      assetManager,
      req,
      res,
      await assetManager.getStoredAdditionalIndexPatterns()
    );
    if (forbidden) {
      audit('failure');
      return forbidden;
    }

    const { updated, failed } = await assetManager.regenerateTaskApiKeys(req);
    audit(failed.length === 0 ? 'success' : 'failure', {
      updated_tasks: updated.length,
      failed_tasks: failed.length,
    });
    return res.ok({ body: { ok: failed.length === 0, updated, failed } });
  } catch (error) {
    audit('failure');
    throw error;
  }
}

export function registerUpdateApiKey(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.UPDATE_API_KEY,
      access: 'public',
      summary: 'Update the API key of the Entity Store tasks',
      description:
        'Replace the API key of every Entity Store background task with one owned by the user making this request, ' +
        'for example after the user who installed the Entity Store is removed. ' +
        'The tasks keep their schedules and state, and no entity data is changed. ' +
        'The user needs the same privileges as the install endpoint. ' +
        'Tasks that could not be updated are listed in `failed`; call the endpoint again to retry them.',
      options: {
        tags: ['oas-tag:Security entity store'],
        availability: { stability: 'stable', since: '9.6.0' },
      },
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/entity_store_update_api_key.yaml'),
        },
      },
      wrapMiddlewares(handleUpdateApiKey)
    );
}
