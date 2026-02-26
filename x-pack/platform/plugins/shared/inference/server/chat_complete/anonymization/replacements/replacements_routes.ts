/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import {
  replaceTokensWithOriginals,
  type DeanonymizeWithReplacementsRequestBody,
} from '@kbn/anonymization-common';
import { apiPrivileges } from '@kbn/anonymization-plugin/common';
import { ReplacementsRepository } from './replacements_repository';

const API_VERSION = '1';
const REPLACEMENTS_API_BASE = '/internal/inference/anonymization/replacements';

export const registerReplacementsRoutes = (
  router: IRouter,
  logger: Logger,
  options: {
    encryptionKey: string;
  }
): void => {
  // GET /internal/inference/anonymization/replacements/{id} — Resolve by ID
  router.versioned
    .get({
      access: 'internal',
      path: `${REPLACEMENTS_API_BASE}/{id}`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          const namespace = coreContext.savedObjects.client.getCurrentNamespace() ?? 'default';
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ReplacementsRepository(esClient, options);
          const replacements = await repo.get(namespace, request.params.id);

          if (!replacements) {
            return response.notFound({ body: { message: 'Replacements set not found' } });
          }

          return response.ok({
            body: {
              id: replacements.id,
              namespace: replacements.namespace,
              replacements: replacements.replacements,
            },
          });
        } catch (err) {
          logger.error(`Failed to resolve replacements: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );

  // POST /internal/inference/anonymization/replacements/_deanonymize — Deanonymize text
  router.versioned
    .post({
      access: 'internal',
      path: `${REPLACEMENTS_API_BASE}/_deanonymize`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            body: schema.object({
              text: schema.string(),
              replacementsId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const body = request.body as DeanonymizeWithReplacementsRequestBody;
          const coreContext = await context.core;
          const namespace = coreContext.savedObjects.client.getCurrentNamespace() ?? 'default';
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ReplacementsRepository(esClient, options);
          const replacements = await repo.get(namespace, body.replacementsId);

          if (!replacements) {
            return response.notFound({ body: { message: 'Replacements set not found' } });
          }

          const deanonymizedText = replaceTokensWithOriginals(
            body.text,
            repo.toTokenToOriginalMap(replacements)
          );

          return response.ok({ body: { text: deanonymizedText } });
        } catch (err) {
          logger.error(`Failed to deanonymize text: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
