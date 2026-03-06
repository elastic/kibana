/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { FieldRule, FindAnonymizationProfilesRequestQuery } from '@kbn/anonymization-common';
import {
  createAnonymizationProfileRequestSchema,
  updateAnonymizationProfileRequestSchema,
} from '@kbn/anonymization-common';
import {
  ANONYMIZATION_API_VERSION,
  ANONYMIZATION_PROFILES_API_BASE,
  apiPrivileges,
  toErrorMessage,
  toStatusCode,
} from '../../common';
import { ProfilesRepository } from '../repository';
import { ensureProfilesIndex } from '../system_index';
import {
  ensureGlobalProfileForNamespace,
  isGlobalProfileTarget,
  LEGACY_ANONYMIZATION_UI_SETTING_KEY,
} from '../initialization';

const validateGlobalProfileRules = (fieldRules: FieldRule[]): string | undefined => {
  if (fieldRules.length > 0) {
    return 'Global anonymization profile cannot contain fieldRules';
  }
};

const resolveRouteContext = async (context: RequestHandlerContext) => {
  const coreContext = await context.core;
  const namespace = coreContext.savedObjects.client.getCurrentNamespace() ?? 'default';
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const repo = new ProfilesRepository(esClient);
  const username = coreContext.security.authc.getCurrentUser()?.username ?? 'unknown';
  return { coreContext, namespace, esClient, repo, username };
};

export const registerProfileRoutes = (
  router: IRouter,
  logger: Logger,
  options: { active: boolean }
): void => {
  // POST /internal/anonymization/profiles — Create profile
  router.versioned
    .post({
      access: 'internal',
      path: ANONYMIZATION_PROFILES_API_BASE,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.manageAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: ANONYMIZATION_API_VERSION,
        validate: {
          request: {
            body: schema.any(),
          },
        },
      },
      async (context, request, response) => {
        try {
          const parseResult = createAnonymizationProfileRequestSchema.safeParse(request.body);
          if (!parseResult.success) {
            return response.badRequest({ body: { message: parseResult.error.message } });
          }
          const body = parseResult.data;
          if (isGlobalProfileTarget(body.targetType, body.targetId)) {
            const globalProfileValidation = validateGlobalProfileRules(body.rules.fieldRules);
            if (globalProfileValidation) {
              return response.badRequest({ body: { message: globalProfileValidation } });
            }
          }

          const { namespace, esClient, repo, username } = await resolveRouteContext(context);
          await ensureProfilesIndex({ esClient, logger });

          const profile = await repo.create({
            ...body,
            namespace,
            createdBy: username,
          });

          return response.ok({ body: profile });
        } catch (err) {
          if (toStatusCode(err) === 409) {
            return response.conflict({ body: { message: toErrorMessage(err) } });
          }
          logger.error(`Failed to create profile: ${toErrorMessage(err)}`);
          return response.customError({
            body: { message: toErrorMessage(err) },
            statusCode: toStatusCode(err),
          });
        }
      }
    );

  // GET /internal/anonymization/profiles/_find — Find profiles
  router.versioned
    .get({
      access: 'internal',
      path: `${ANONYMIZATION_PROFILES_API_BASE}/_find`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: ANONYMIZATION_API_VERSION,
        validate: {
          request: {
            query: schema.object({
              filter: schema.maybe(schema.string()),
              target_type: schema.maybe(
                schema.oneOf([
                  schema.literal('data_view'),
                  schema.literal('index_pattern'),
                  schema.literal('index'),
                ])
              ),
              target_id: schema.maybe(schema.string()),
              sort_field: schema.maybe(
                schema.oneOf([
                  schema.literal('created_at'),
                  schema.literal('name'),
                  schema.literal('updated_at'),
                ])
              ),
              sort_order: schema.maybe(
                schema.oneOf([schema.literal('asc'), schema.literal('desc')])
              ),
              page: schema.maybe(schema.number({ min: 1 })),
              per_page: schema.maybe(schema.number({ min: 1, max: 1000 })),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const query = request.query as FindAnonymizationProfilesRequestQuery;
          const { coreContext, namespace, esClient, repo } = await resolveRouteContext(context);
          await ensureProfilesIndex({ esClient, logger });
          if (options.active) {
            await ensureGlobalProfileForNamespace({
              namespace,
              profilesRepo: repo,
              logger,
              getLegacySettingsString: () =>
                coreContext.uiSettings.client.get<string | undefined>(
                  LEGACY_ANONYMIZATION_UI_SETTING_KEY
                ),
              forceEnsure: true,
            });
          }
          const result = await repo.find({
            namespace,
            filter: query.filter,
            targetType: query.target_type,
            targetId: query.target_id,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            page: query.page,
            perPage: query.per_page,
          });

          return response.ok({ body: result });
        } catch (err) {
          logger.error(`Failed to find profiles: ${toErrorMessage(err)}`);
          return response.customError({
            body: { message: toErrorMessage(err) },
            statusCode: toStatusCode(err),
          });
        }
      }
    );

  // GET /internal/anonymization/profiles/{id} — Get profile by ID
  router.versioned
    .get({
      access: 'internal',
      path: `${ANONYMIZATION_PROFILES_API_BASE}/{id}`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: ANONYMIZATION_API_VERSION,
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { namespace, repo } = await resolveRouteContext(context);
          const profile = await repo.get(namespace, request.params.id);

          if (!profile) {
            return response.notFound({ body: { message: 'Profile not found' } });
          }

          return response.ok({ body: profile });
        } catch (err) {
          logger.error(`Failed to get profile: ${toErrorMessage(err)}`);
          return response.customError({
            body: { message: toErrorMessage(err) },
            statusCode: toStatusCode(err),
          });
        }
      }
    );

  // PUT /internal/anonymization/profiles/{id} — Update profile
  router.versioned
    .put({
      access: 'internal',
      path: `${ANONYMIZATION_PROFILES_API_BASE}/{id}`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.manageAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: ANONYMIZATION_API_VERSION,
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
            body: schema.any(),
          },
        },
      },
      async (context, request, response) => {
        try {
          const parseResult = updateAnonymizationProfileRequestSchema.safeParse(request.body);
          if (!parseResult.success) {
            return response.badRequest({ body: { message: parseResult.error.message } });
          }
          const body = parseResult.data;

          const { namespace, repo, username } = await resolveRouteContext(context);
          const existing = await repo.get(namespace, request.params.id);
          if (!existing) {
            return response.notFound({ body: { message: 'Profile not found' } });
          }

          if (
            isGlobalProfileTarget(existing.targetType, existing.targetId) &&
            body.rules?.fieldRules
          ) {
            const globalProfileValidation = validateGlobalProfileRules(body.rules.fieldRules);
            if (globalProfileValidation) {
              return response.badRequest({ body: { message: globalProfileValidation } });
            }
          }

          const profile = await repo.update(namespace, request.params.id, {
            ...body,
            updatedBy: username,
          });

          if (!profile) {
            return response.notFound({ body: { message: 'Profile not found' } });
          }

          return response.ok({ body: profile });
        } catch (err) {
          logger.error(`Failed to update profile: ${toErrorMessage(err)}`);
          return response.customError({
            body: { message: toErrorMessage(err) },
            statusCode: toStatusCode(err),
          });
        }
      }
    );

  // DELETE /internal/anonymization/profiles/{id} — Delete profile
  router.versioned
    .delete({
      access: 'internal',
      path: `${ANONYMIZATION_PROFILES_API_BASE}/{id}`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.manageAnonymization],
        },
      },
    })
    .addVersion(
      {
        version: ANONYMIZATION_API_VERSION,
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { namespace, repo } = await resolveRouteContext(context);
          const deleted = await repo.delete(namespace, request.params.id);

          if (!deleted) {
            return response.notFound({ body: { message: 'Profile not found' } });
          }

          return response.ok({ body: { deleted: true } });
        } catch (err) {
          logger.error(`Failed to delete profile: ${toErrorMessage(err)}`);
          return response.customError({
            body: { message: toErrorMessage(err) },
            statusCode: toStatusCode(err),
          });
        }
      }
    );
};
