/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { replaceTokensWithOriginals } from '@kbn/anonymization-common';
import { apiPrivileges } from '@kbn/anonymization-plugin/common';
import { ReplacementsRepository } from './replacements_repository';
import { ensureReplacementsIndex } from './replacements_index';

const API_VERSION = '1';
const REPLACEMENTS_API_BASE = '/internal/inference/anonymization/replacements';

/**
 * Extracts the space ID from the request URL.
 */
const getNamespace = (request: { url: { pathname?: string } }): string => {
  const match = request.url.pathname?.match(/^\/s\/([^/]+)/);
  return match?.[1] ?? 'default';
};

export const registerReplacementsRoutes = (router: IRouter, logger: Logger): void => {
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
          const namespace = getNamespace(request);
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ReplacementsRepository(esClient);
          const replacements = await repo.get(namespace, request.params.id);

          if (!replacements) {
            return response.notFound({ body: { message: 'Replacements set not found' } });
          }

          return response.ok({
            body: {
              id: replacements.id,
              tokenToOriginal: replacements.tokenToOriginal,
              scopeType: replacements.scopeType,
              scopeId: replacements.scopeId,
              profileId: replacements.profileId,
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

  // GET /internal/inference/anonymization/replacements/_by_scope — Resolve by scope
  router.versioned
    .get({
      access: 'internal',
      path: `${REPLACEMENTS_API_BASE}/_by_scope`,
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
            query: schema.object({
              type: schema.oneOf([schema.literal('thread'), schema.literal('execution')]),
              id: schema.string(),
              profile_id: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const namespace = getNamespace(request);
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ReplacementsRepository(esClient);
          const replacements = await repo.findByScope(
            namespace,
            request.query.type,
            request.query.id,
            request.query.profile_id
          );

          if (!replacements) {
            return response.notFound({ body: { message: 'Replacements set not found' } });
          }

          return response.ok({
            body: {
              id: replacements.id,
              tokenToOriginal: replacements.tokenToOriginal,
              scopeType: replacements.scopeType,
              scopeId: replacements.scopeId,
              profileId: replacements.profileId,
            },
          });
        } catch (err) {
          logger.error(`Failed to resolve replacements by scope: ${err.message}`);
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
          const namespace = getNamespace(request);
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ReplacementsRepository(esClient);
          const replacements = await repo.get(namespace, request.body.replacementsId);

          if (!replacements) {
            return response.notFound({ body: { message: 'Replacements set not found' } });
          }

          const deanonymizedText = replaceTokensWithOriginals(
            request.body.text,
            replacements.tokenToOriginal
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

  // POST /internal/inference/anonymization/replacements/_import — Import/merge
  router.versioned
    .post({
      access: 'internal',
      path: `${REPLACEMENTS_API_BASE}/_import`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.manageAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            body: schema.object({
              sourceId: schema.string(),
              destinationId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const namespace = getNamespace(request);
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          await ensureReplacementsIndex({ esClient, logger });

          const repo = new ReplacementsRepository(esClient);
          const result = await repo.importReplacements(
            namespace,
            request.body.sourceId,
            request.body.destinationId
          );

          return response.ok({ body: { id: result.id, merged: true } });
        } catch (err) {
          if ((err as any).statusCode === 409) {
            return response.conflict({ body: { message: err.message } });
          }
          if ((err as any).statusCode === 404) {
            return response.notFound({ body: { message: err.message } });
          }
          logger.error(`Failed to import replacements: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
