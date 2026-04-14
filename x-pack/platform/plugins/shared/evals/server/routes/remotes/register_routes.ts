/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { schema } from '@kbn/config-schema';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { PLUGIN_ID } from '../../../common';
import {
  EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
  type EvalsRemoteKibanaConfigAttributes,
} from '../../saved_objects/remote_kibana_config';
import { validateElasticCloudUrl } from '../../remote_kibana/forward_to_remote_kibana';
import type { RouteDependencies } from '../register_routes';

const REMOTES_URL = '/internal/evals/remotes' as const;
const REMOTE_URL = '/internal/evals/remotes/{remoteId}' as const;
const REMOTES_TEST_URL = '/internal/evals/remotes/_test' as const;

const RemoteIdParamSchema = schema.object({ remoteId: schema.string({ minLength: 1 }) });

const elasticCloudUrlSchema = schema.string({
  minLength: 1,
  validate: (value) => validateElasticCloudUrl(value),
});

const CreateRemoteBodySchema = schema.object({
  displayName: schema.string({ minLength: 1 }),
  url: elasticCloudUrlSchema,
  apiKey: schema.string({ minLength: 1 }),
});

const UpdateRemoteBodySchema = schema.object({
  displayName: schema.maybe(schema.string({ minLength: 1 })),
  url: schema.maybe(elasticCloudUrlSchema),
  apiKey: schema.maybe(schema.string({ minLength: 1 })),
});

const TestRemoteBodySchema = schema.object({
  url: schema.maybe(elasticCloudUrlSchema),
  apiKey: schema.maybe(schema.string({ minLength: 1 })),
  remoteId: schema.maybe(schema.string({ minLength: 1 })),
});

const TEST_TIMEOUT_MS = 15_000;

export const registerRemoteConfigsRoutes = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
  getInternalRemoteConfigsSoClient,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: REMOTES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List remote dataset management Kibana configurations',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (context, request, response) => {
        try {
          const internalSoClient = await getInternalRemoteConfigsSoClient();

          const found = await internalSoClient.find<{ displayName?: string; url?: string }>({
            type: EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
            perPage: 1000,
          });

          return response.ok({
            body: {
              remotes: found.saved_objects.map((so) => ({
                id: so.id,
                displayName: so.attributes.displayName ?? '',
                url: so.attributes.url ?? '',
              })),
            },
          });
        } catch (error) {
          logger.error(`Failed to list remote Kibana configs: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list remote Kibana configs' },
          });
        }
      }
    );

  router.versioned
    .post({
      path: REMOTES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Create remote dataset management Kibana configuration',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: CreateRemoteBodySchema,
          },
        },
      },
      async (context, request, response) => {
        if (!canEncrypt) {
          return response.customError({
            statusCode: 501,
            body: {
              message: 'Encrypted Saved Objects is not configured. Remote sync is unavailable.',
            },
          });
        }

        try {
          const internalSoClient = await getInternalRemoteConfigsSoClient();

          const now = new Date().toISOString();
          const attributes: EvalsRemoteKibanaConfigAttributes = {
            displayName: request.body.displayName,
            url: request.body.url,
            apiKey: request.body.apiKey,
            createdAt: now,
            updatedAt: now,
          };

          const created = await internalSoClient.create(
            EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
            attributes,
            {
              managed: true,
            }
          );

          return response.ok({
            body: { id: created.id, displayName: attributes.displayName, url: attributes.url },
          });
        } catch (error) {
          logger.error(`Failed to create remote Kibana config: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to create remote Kibana config' },
          });
        }
      }
    );

  router.versioned
    .put({
      path: REMOTE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Update remote dataset management Kibana configuration',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: RemoteIdParamSchema,
            body: UpdateRemoteBodySchema,
          },
        },
      },
      async (context, request, response) => {
        const { remoteId } = request.params;
        const internalSoClient = await getInternalRemoteConfigsSoClient();

        try {
          const now = new Date().toISOString();
          const requiresReEncryption = request.body.apiKey != null || request.body.url != null;

          if (requiresReEncryption) {
            // `url` is included in AAD, so changing it (or the apiKey) requires a full
            // decrypt-then-overwrite cycle to keep the authenticated data in sync.
            if (!canEncrypt) {
              return response.customError({
                statusCode: 501,
                body: {
                  message: 'Encrypted Saved Objects is not configured. Remote sync is unavailable.',
                },
              });
            }

            const encryptedClient = (await getEncryptedSavedObjectsStart()).getClient({
              includedHiddenTypes: [EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE],
            });

            const existing =
              await encryptedClient.getDecryptedAsInternalUser<EvalsRemoteKibanaConfigAttributes>(
                EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
                remoteId
              );

            const next: EvalsRemoteKibanaConfigAttributes = {
              ...existing.attributes,
              ...(request.body.displayName != null
                ? { displayName: request.body.displayName }
                : {}),
              ...(request.body.url != null ? { url: request.body.url } : {}),
              ...(request.body.apiKey != null ? { apiKey: request.body.apiKey } : {}),
              updatedAt: now,
            };

            await internalSoClient.create(EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE, next, {
              id: remoteId,
              overwrite: true,
              version: existing.version,
            });

            return response.ok({
              body: { id: remoteId, displayName: next.displayName, url: next.url },
            });
          }

          // Only non-AAD fields changed (e.g. displayName): safe partial update.
          const updates: Partial<EvalsRemoteKibanaConfigAttributes> = {
            ...(request.body.displayName != null ? { displayName: request.body.displayName } : {}),
            updatedAt: now,
          };

          await internalSoClient.update(
            EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
            remoteId,
            updates
          );

          const updated = await internalSoClient.get<{ displayName?: string; url?: string }>(
            EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
            remoteId
          );

          return response.ok({
            body: {
              id: remoteId,
              displayName: updated.attributes.displayName ?? '',
              url: updated.attributes.url ?? '',
            },
          });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return response.notFound({ body: { message: `Remote config not found: ${remoteId}` } });
          }
          if (SavedObjectsErrorHelpers.isConflictError(error)) {
            return response.conflict({
              body: {
                message: 'Remote config was modified concurrently. Please refresh and try again.',
              },
            });
          }
          logger.error(`Failed to update remote Kibana config: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update remote Kibana config' },
          });
        }
      }
    );

  router.versioned
    .delete({
      path: REMOTE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Delete remote dataset management Kibana configuration',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: RemoteIdParamSchema,
          },
        },
      },
      async (context, request, response) => {
        const { remoteId } = request.params;
        try {
          const internalSoClient = await getInternalRemoteConfigsSoClient();

          await internalSoClient.delete(EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE, remoteId, {
            force: true,
          });

          return response.ok({ body: { deleted: true } });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return response.notFound({ body: { message: `Remote config not found: ${remoteId}` } });
          }
          logger.error(`Failed to delete remote Kibana config: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to delete remote Kibana config' },
          });
        }
      }
    );

  router.versioned
    .post({
      path: REMOTES_TEST_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Test connection to a remote Kibana instance',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: TestRemoteBodySchema,
          },
        },
      },
      async (context, request, response) => {
        let resolvedUrl: string;
        let resolvedApiKey: string;

        try {
          if (request.body.remoteId) {
            if (!canEncrypt) {
              return response.ok({
                body: {
                  success: false,
                  statusCode: 0,
                  message: 'Encrypted Saved Objects is not configured.',
                },
              });
            }
            const encryptedSoStart = await getEncryptedSavedObjectsStart();
            const encryptedClient = encryptedSoStart.getClient({
              includedHiddenTypes: [EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE],
            });

            const decrypted =
              await encryptedClient.getDecryptedAsInternalUser<EvalsRemoteKibanaConfigAttributes>(
                EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
                request.body.remoteId
              );

            resolvedUrl = request.body.url?.trim() || decrypted.attributes.url;
            resolvedApiKey = request.body.apiKey?.trim() || decrypted.attributes.apiKey;
          } else {
            if (!request.body.url?.trim() || !request.body.apiKey?.trim()) {
              return response.ok({
                body: {
                  success: false,
                  statusCode: 0,
                  message: 'URL and API key are required.',
                },
              });
            }
            resolvedUrl = request.body.url.trim();
            resolvedApiKey = request.body.apiKey.trim();
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(`Remote connection test - credential resolution failed: ${msg}`);
          return response.ok({
            body: { success: false, statusCode: 0, message: msg },
          });
        }

        const urlValidationError = validateElasticCloudUrl(resolvedUrl);
        if (urlValidationError) {
          return response.ok({
            body: { success: false, statusCode: 0, message: urlValidationError },
          });
        }

        try {
          const remote = new URL(resolvedUrl);
          const basePath = remote.pathname === '/' ? '' : remote.pathname.replace(/\/$/, '');
          remote.pathname = `${basePath}/internal/evals/datasets`;
          remote.searchParams.set('page', '1');
          remote.searchParams.set('per_page', '1');

          const res = await fetch(remote.toString(), {
            method: 'GET',
            headers: {
              'kbn-xsrf': 'true',
              'x-elastic-internal-origin': 'kibana',
              'elastic-api-version': API_VERSIONS.internal.v1,
              Authorization: `ApiKey ${resolvedApiKey}`,
            },
            timeout: TEST_TIMEOUT_MS,
          });

          if (res.ok) {
            return response.ok({
              body: { success: true, statusCode: res.status },
            });
          }

          return response.ok({
            body: {
              success: false,
              statusCode: res.status,
              message: `Remote responded with HTTP ${res.status}`,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn(`Remote connection test failed: ${message}`);
          return response.ok({
            body: { success: false, statusCode: 0, message },
          });
        }
      }
    );
};
