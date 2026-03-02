/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  replaceTokensWithOriginals,
  type DeanonymizeWithReplacementsRequestBody,
} from '@kbn/anonymization-common';
import { apiPrivileges } from '@kbn/anonymization-plugin/common';
import { ReplacementsRepository } from './replacements_repository';
import { ensureReplacementsIndex } from './replacements_index';
import type { InferenceServerStart, InferenceStartDependencies } from '../../../types';

const API_VERSION = '1';
const REPLACEMENTS_API_BASE = '/internal/inference/anonymization/replacements';

const toErrorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const toStatusCode = (err: unknown): number => {
  const directStatus = (err as { statusCode?: number })?.statusCode;
  const metaStatus = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
  return directStatus ?? metaStatus ?? 500;
};

const assertReplacementsEncryptionKeyConfigured = (encryptionKey?: string): void => {
  if (!encryptionKey) {
    const error = new Error(
      'xpack.inference.replacements.encryptionKey must be configured to use replacements APIs'
    ) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
};

const INDEX_ENSURE_CACHE_MS = 60_000;
let replacementsIndexEnsuredAt = 0;

const resolveEncryptionKey = async ({
  coreSetup,
  request,
  namespace,
  configuredEncryptionKey,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  request: KibanaRequest;
  namespace: string;
  configuredEncryptionKey?: string;
}): Promise<string | undefined> => {
  const [, pluginsStart] = await coreSetup.getStartServices();
  const anonymizationPlugin = pluginsStart.anonymization;
  const anonymizationEnabled = anonymizationPlugin?.isEnabled() ?? false;

  if (!anonymizationEnabled) {
    return configuredEncryptionKey;
  }

  return anonymizationPlugin?.getPolicyService().getReplacementsEncryptionKey(namespace);
};

const resolveReplacementsContext = async (
  context: RequestHandlerContext,
  request: KibanaRequest,
  options: {
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
    encryptionKey?: string;
    logger: Logger;
  }
) => {
  const coreContext = await context.core;
  const namespace = coreContext.savedObjects.client.getCurrentNamespace() ?? 'default';
  const encryptionKey = await resolveEncryptionKey({
    coreSetup: options.coreSetup,
    request,
    namespace,
    configuredEncryptionKey: options.encryptionKey,
  });
  assertReplacementsEncryptionKeyConfigured(encryptionKey);
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  if (Date.now() - replacementsIndexEnsuredAt > INDEX_ENSURE_CACHE_MS) {
    await ensureReplacementsIndex({ esClient, logger: options.logger });
    replacementsIndexEnsuredAt = Date.now();
  }

  const repo = new ReplacementsRepository(esClient, { encryptionKey });
  return { namespace, repo };
};

export const registerReplacementsRoutes = (
  router: IRouter,
  logger: Logger,
  options: {
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
    encryptionKey?: string;
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
          const { namespace, repo } = await resolveReplacementsContext(context, request, {
            ...options,
            logger,
          });
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
          logger.error(`Failed to resolve replacements: ${toErrorMessage(err)}`);
          return response.customError({
            body: { message: toErrorMessage(err) },
            statusCode: toStatusCode(err),
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
          const { namespace, repo } = await resolveReplacementsContext(context, request, {
            ...options,
            logger,
          });
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
          logger.error(`Failed to deanonymize text: ${toErrorMessage(err)}`);
          return response.customError({
            body: { message: toErrorMessage(err) },
            statusCode: toStatusCode(err),
          });
        }
      }
    );
};
