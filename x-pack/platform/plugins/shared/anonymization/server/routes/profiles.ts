/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { ANONYMIZATION_API_VERSION, ANONYMIZATION_PROFILES_API_BASE } from '../../common';
import { ProfilesRepository } from '../repository';
import { ensureProfilesIndex } from '../system_index';
import { assertPrivilege, ANONYMIZATION_PRIVILEGES } from './rbac';

const fieldRuleSchema = schema.object({
  field: schema.string(),
  allowed: schema.boolean(),
  anonymized: schema.boolean(),
  entityClass: schema.maybe(schema.string()),
});

const regexRuleSchema = schema.object({
  id: schema.string(),
  type: schema.literal('regex'),
  entityClass: schema.string(),
  pattern: schema.string(),
  enabled: schema.boolean(),
});

const nerRuleSchema = schema.object({
  id: schema.string(),
  type: schema.literal('ner'),
  modelId: schema.string(),
  allowedEntityClasses: schema.arrayOf(schema.string()),
  enabled: schema.boolean(),
});

const rulesSchema = schema.object({
  fieldRules: schema.arrayOf(fieldRuleSchema),
  regexRules: schema.maybe(schema.arrayOf(regexRuleSchema)),
  nerRules: schema.maybe(schema.arrayOf(nerRuleSchema)),
});

/**
 * Validates that every field rule with anonymized=true has an entityClass.
 */
const validateFieldRules = (
  fieldRules: Array<{ allowed: boolean; anonymized: boolean; entityClass?: string }>
): string | undefined => {
  for (const rule of fieldRules) {
    if (rule.anonymized && !rule.entityClass) {
      return 'entityClass is required when anonymized is true';
    }
  }
};

/**
 * Extracts the space ID from the request.
 */
const getNamespace = (request: { url: { pathname?: string } }): string => {
  // Kibana prefixes space-scoped URLs with /s/{spaceId}
  const match = request.url.pathname?.match(/^\/s\/([^/]+)/);
  return match?.[1] ?? 'default';
};

export const registerProfileRoutes = (router: IRouter, logger: Logger): void => {
  // POST /internal/anonymization/profiles — Create profile
  router.versioned
    .post({
      access: 'internal',
      path: ANONYMIZATION_PROFILES_API_BASE,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization handled by custom RBAC checks',
        },
      },
    })
    .addVersion(
      {
        version: ANONYMIZATION_API_VERSION,
        validate: {
          request: {
            body: schema.object({
              name: schema.string(),
              description: schema.maybe(schema.string()),
              targetType: schema.oneOf([
                schema.literal('data_view'),
                schema.literal('index_pattern'),
                schema.literal('index'),
              ]),
              targetId: schema.string(),
              rules: rulesSchema,
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          await assertPrivilege(coreContext, ANONYMIZATION_PRIVILEGES.MANAGE);

          const validationError = validateFieldRules(request.body.rules.fieldRules);
          if (validationError) {
            return response.badRequest({ body: { message: validationError } });
          }

          const namespace = getNamespace(request);
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          await ensureProfilesIndex({ esClient, logger });

          const repo = new ProfilesRepository(esClient, logger);

          const saltId = `salt-${namespace}`;

          const profile = await repo.create({
            ...request.body,
            saltId,
            namespace,
            createdBy: coreContext.security.authc.getCurrentUser()?.username ?? 'unknown',
          });

          return response.ok({ body: profile });
        } catch (err) {
          if ((err as any).statusCode === 403) {
            return response.forbidden({ body: { message: err.message } });
          }
          if ((err as any).statusCode === 409) {
            return response.conflict({ body: { message: err.message } });
          }
          logger.error(`Failed to create profile: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
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
          enabled: false,
          reason: 'Authorization handled by custom RBAC checks',
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
              target_type: schema.maybe(schema.string()),
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
          const coreContext = await context.core;
          await assertPrivilege(coreContext, ANONYMIZATION_PRIVILEGES.READ);

          const namespace = getNamespace(request);
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          await ensureProfilesIndex({ esClient, logger });

          const repo = new ProfilesRepository(esClient, logger);
          const result = await repo.find({
            namespace,
            filter: request.query.filter,
            targetType: request.query.target_type,
            targetId: request.query.target_id,
            sortField: request.query.sort_field as 'created_at' | 'name' | 'updated_at' | undefined,
            sortOrder: request.query.sort_order as 'asc' | 'desc' | undefined,
            page: request.query.page,
            perPage: request.query.per_page,
          });

          return response.ok({ body: result });
        } catch (err) {
          if ((err as any).statusCode === 403) {
            return response.forbidden({ body: { message: err.message } });
          }
          logger.error(`Failed to find profiles: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
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
          enabled: false,
          reason: 'Authorization handled by custom RBAC checks',
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
          const coreContext = await context.core;
          await assertPrivilege(coreContext, ANONYMIZATION_PRIVILEGES.READ);

          const namespace = getNamespace(request);
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ProfilesRepository(esClient, logger);
          const profile = await repo.get(namespace, request.params.id);

          if (!profile) {
            return response.notFound({ body: { message: 'Profile not found' } });
          }

          return response.ok({ body: profile });
        } catch (err) {
          if ((err as any).statusCode === 403) {
            return response.forbidden({ body: { message: err.message } });
          }
          logger.error(`Failed to get profile: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
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
          enabled: false,
          reason: 'Authorization handled by custom RBAC checks',
        },
      },
    })
    .addVersion(
      {
        version: ANONYMIZATION_API_VERSION,
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
            body: schema.object({
              name: schema.maybe(schema.string()),
              description: schema.maybe(schema.string()),
              rules: schema.maybe(rulesSchema),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          await assertPrivilege(coreContext, ANONYMIZATION_PRIVILEGES.MANAGE);

          if (request.body.rules?.fieldRules) {
            const validationError = validateFieldRules(request.body.rules.fieldRules);
            if (validationError) {
              return response.badRequest({ body: { message: validationError } });
            }
          }

          const namespace = getNamespace(request);
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ProfilesRepository(esClient, logger);
          const profile = await repo.update(namespace, request.params.id, {
            ...request.body,
            updatedBy: coreContext.security.authc.getCurrentUser()?.username ?? 'unknown',
          });

          if (!profile) {
            return response.notFound({ body: { message: 'Profile not found' } });
          }

          return response.ok({ body: profile });
        } catch (err) {
          if ((err as any).statusCode === 403) {
            return response.forbidden({ body: { message: err.message } });
          }
          logger.error(`Failed to update profile: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
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
          enabled: false,
          reason: 'Authorization handled by custom RBAC checks',
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
          const coreContext = await context.core;
          await assertPrivilege(coreContext, ANONYMIZATION_PRIVILEGES.MANAGE);

          const namespace = getNamespace(request);
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          const repo = new ProfilesRepository(esClient, logger);
          const deleted = await repo.delete(namespace, request.params.id);

          if (!deleted) {
            return response.notFound({ body: { message: 'Profile not found' } });
          }

          return response.ok({ body: { deleted: true } });
        } catch (err) {
          if ((err as any).statusCode === 403) {
            return response.forbidden({ body: { message: err.message } });
          }
          logger.error(`Failed to delete profile: ${err.message}`);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
