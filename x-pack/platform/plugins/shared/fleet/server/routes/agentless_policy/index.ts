/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'node:path';

import { schema } from '@kbn/config-schema';

import {
  BulkUpgradeAgentlessPoliciesRequestSchema,
  BulkUpgradeAgentlessPoliciesResponseSchema,
  AgentlessPolicyUpgradeDryRunRequestSchema,
  AgentlessPolicyUpgradeDryRunResponseSchema,
  CreateAgentlessPolicyRequestSchema,
  DeleteAgentlessPolicyRequestSchema,
  DeleteAgentlessPolicyResponseSchema,
  GetBulkAgentlessPolicyThroughputRequestSchema,
  GetBulkAgentlessPolicyThroughputResponseSchema,
  GetAgentlessPolicyRequestSchema,
  UpdateAgentlessPolicyRequestSchema,
} from '../../../common/types/rest_spec/agentless_policy';
import { AgentlessPolicyResponseSchema } from '../../../common/types/models/agentless_policy_schema';
import {
  AGENTLESS_POLICIES_ROUTES,
  API_VERSIONS,
  MANAGED_INTEGRATIONS_ROUTES,
} from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { AgentlessPolicyListResponseSchema, ListAgentlessPoliciesRequestSchema } from '../../types';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse, notFoundResponse } from '../schema/errors';

import {
  bulkUpgradeAgentlessPoliciesHandler,
  createAgentlessPolicyHandler,
  deleteAgentlessPolicyHandler,
  getAgentlessPolicyHandler,
  listAgentlessPoliciesHandler,
  syncAgentlessPoliciesHandler,
  getBulkAgentlessPolicyThroughputHandler,
  updateAgentlessPolicyHandler,
  upgradeAgentlessPoliciesDryRunHandler,
} from './handler';

const MANAGED_INTEGRATIONS_TAG = 'oas-tag:Fleet managed integrations';
const DEPRECATED_AGENTLESS_TAG = 'oas-tag:Fleet agentless policies';

interface AliasedRoute {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  canonicalPath: string;
  deprecatedPath: string;
  summary: string;
  description: string;
}

/**
 * OAS presentation for one registration of an aliased route: the canonical
 * `/managed_integrations` path or its deprecated `/agentless_policies` alias.
 */
interface RoutePresentation {
  summary: string;
  description: string;
  tag: string;
}

/**
 * Registers a public route twice: once at its canonical `/managed_integrations` path and once at
 * the deprecated `/agentless_policies` alias, both bound to the same handler and schema via
 * `register`. The alias only differs in its OAS summary/description/tag so existing clients keep
 * working while the reference steers them to the new path.
 */
const withDeprecatedAlias = (
  { method, canonicalPath, deprecatedPath, summary, description }: AliasedRoute,
  register: (routePath: string, presentation: RoutePresentation) => void
) => {
  register(canonicalPath, { summary, description, tag: MANAGED_INTEGRATIONS_TAG });
  register(deprecatedPath, {
    summary: `Deprecated: ${summary}`,
    description: `Deprecated. Use \`${method} ${canonicalPath}\` instead. ${description}`,
    tag: DEPRECATED_AGENTLESS_TAG,
  });
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  // Sync (internal, not aliased)
  router.versioned
    .post({
      enableQueryVersion: true,
      path: MANAGED_INTEGRATIONS_ROUTES.SYNC_PATTERN,
      summary: 'Sync managed integrations',
      description: 'Sync managed integrations',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.FLEET.ALL,
            FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
          ],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              dryRun: schema.boolean({
                defaultValue: false,
                meta: { description: 'If true, no changes are applied.' },
              }),
            }),
          },
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () =>
                schema.object({
                  success: schema.boolean({
                    meta: {
                      description: 'Indicates if the sync was successful.',
                    },
                  }),
                }),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      syncAgentlessPoliciesHandler
    );

  // Create
  withDeprecatedAlias(
    {
      method: 'POST',
      canonicalPath: MANAGED_INTEGRATIONS_ROUTES.CREATE_PATTERN,
      deprecatedPath: AGENTLESS_POLICIES_ROUTES.CREATE_PATTERN,
      summary: 'Create a managed integration',
      description: 'Create a managed integration',
    },
    (routePath, { summary, description, tag }) =>
      router.versioned
        // @ts-ignore https://github.com/elastic/kibana/issues/203170
        .post({
          path: routePath,
          summary,
          description,
          options: {
            tags: [tag],
            availability: {
              since: '9.3.0',
              stability: 'experimental',
            },
          },
          fleetAuthz: {
            integrations: { writeIntegrationPolicies: true },
          },
        })
        .addVersion(
          {
            version: API_VERSIONS.public.v1,
            options: {
              oasOperationObject: () =>
                path.join(__dirname, 'examples/create_managed_integrations.yaml'),
            },
            validate: {
              request: CreateAgentlessPolicyRequestSchema,
              response: {
                200: {
                  description: 'OK: A successful request.',
                  body: () => AgentlessPolicyResponseSchema,
                },
                400: {
                  description: 'A bad request.',
                  body: genericErrorResponse,
                },
                409: {
                  description: 'A conflict occurred.',
                  body: genericErrorResponse,
                },
              },
            },
          },
          createAgentlessPolicyHandler
        )
  );

  // List
  withDeprecatedAlias(
    {
      method: 'GET',
      canonicalPath: MANAGED_INTEGRATIONS_ROUTES.LIST_PATTERN,
      deprecatedPath: AGENTLESS_POLICIES_ROUTES.LIST_PATTERN,
      summary: 'Get managed integrations',
      description: 'List managed integrations',
    },
    (routePath, { summary, description, tag }) =>
      router.versioned
        // @ts-ignore https://github.com/elastic/kibana/issues/203170
        .get({
          path: routePath,
          summary,
          description,
          options: {
            tags: [tag],
            availability: {
              since: '9.5.0',
              stability: 'experimental',
            },
          },
          fleetAuthz: {
            integrations: { readIntegrationPolicies: true },
          },
        })
        .addVersion(
          {
            version: API_VERSIONS.public.v1,
            options: {
              oasOperationObject: () =>
                path.join(__dirname, 'examples/list_managed_integrations.yaml'),
            },
            validate: {
              request: ListAgentlessPoliciesRequestSchema,
              response: {
                200: {
                  description: 'OK: A successful request.',
                  body: () => AgentlessPolicyListResponseSchema,
                },
                400: {
                  description: 'A bad request.',
                  body: genericErrorResponse,
                },
              },
            },
          },
          listAgentlessPoliciesHandler
        )
  );

  // Get
  withDeprecatedAlias(
    {
      method: 'GET',
      canonicalPath: MANAGED_INTEGRATIONS_ROUTES.GET_PATTERN,
      deprecatedPath: AGENTLESS_POLICIES_ROUTES.GET_PATTERN,
      summary: 'Get a managed integration',
      description: 'Get a managed integration by ID',
    },
    (routePath, { summary, description, tag }) =>
      router.versioned
        // @ts-ignore https://github.com/elastic/kibana/issues/203170
        .get({
          path: routePath,
          summary,
          description,
          options: {
            tags: [tag],
            availability: {
              since: '9.5.0',
              stability: 'experimental',
            },
          },
          fleetAuthz: {
            integrations: { readIntegrationPolicies: true },
          },
        })
        .addVersion(
          {
            version: API_VERSIONS.public.v1,
            options: {
              oasOperationObject: () =>
                path.join(__dirname, 'examples/get_managed_integration.yaml'),
            },
            validate: {
              request: GetAgentlessPolicyRequestSchema,
              response: {
                200: {
                  description: 'OK: A successful request.',
                  body: () => AgentlessPolicyResponseSchema,
                },
                400: {
                  description: 'A bad request.',
                  body: genericErrorResponse,
                },
                404: {
                  description: 'The managed integration was not found.',
                  body: notFoundResponse,
                },
              },
            },
          },
          getAgentlessPolicyHandler
        )
  );

  // Update
  withDeprecatedAlias(
    {
      method: 'PUT',
      canonicalPath: MANAGED_INTEGRATIONS_ROUTES.UPDATE_PATTERN,
      deprecatedPath: AGENTLESS_POLICIES_ROUTES.UPDATE_PATTERN,
      summary: 'Update a managed integration',
      description:
        'Update a managed integration by ID. Uses full-replace semantics: the policy is rebuilt entirely from the request body, so any omitted optional field (for example, `description`, `vars`, `global_data_tags`, `cloud_connector`) is cleared or reset to its default. The integration package name is immutable and the runtime-managed `cluster_id` is preserved from the existing policy.',
    },
    (routePath, { summary, description, tag }) =>
      router.versioned
        // @ts-ignore https://github.com/elastic/kibana/issues/203170
        .put({
          path: routePath,
          summary,
          description,
          options: {
            tags: [tag],
            availability: {
              since: '9.5.0',
              stability: 'experimental',
            },
          },
          fleetAuthz: {
            integrations: { writeIntegrationPolicies: true },
          },
        })
        .addVersion(
          {
            version: API_VERSIONS.public.v1,
            options: {
              oasOperationObject: () =>
                path.join(__dirname, 'examples/update_managed_integration.yaml'),
            },
            validate: {
              request: UpdateAgentlessPolicyRequestSchema,
              response: {
                200: {
                  description: 'OK: A successful request.',
                  body: () => AgentlessPolicyResponseSchema,
                },
                400: {
                  description: 'A bad request.',
                  body: genericErrorResponse,
                },
                404: {
                  description: 'The managed integration was not found.',
                  body: notFoundResponse,
                },
                409: {
                  description:
                    'A conflict occurred — for example, the requested name is already used by another integration policy.',
                  body: genericErrorResponse,
                },
              },
            },
          },
          updateAgentlessPolicyHandler
        )
  );

  // Delete
  withDeprecatedAlias(
    {
      method: 'DELETE',
      canonicalPath: MANAGED_INTEGRATIONS_ROUTES.DELETE_PATTERN,
      deprecatedPath: AGENTLESS_POLICIES_ROUTES.DELETE_PATTERN,
      summary: 'Delete a managed integration',
      description: 'Delete a managed integration',
    },
    (routePath, { summary, description, tag }) =>
      router.versioned
        // @ts-ignore https://github.com/elastic/kibana/issues/203170
        .delete({
          path: routePath,
          summary,
          description,
          options: {
            tags: [tag],
            availability: {
              since: '9.3.0',
              stability: 'experimental',
            },
          },
          fleetAuthz: {
            integrations: { writeIntegrationPolicies: true },
          },
        })
        .addVersion(
          {
            version: API_VERSIONS.public.v1,
            options: {
              oasOperationObject: () =>
                path.join(__dirname, 'examples/delete_managed_integrations.yaml'),
            },
            validate: {
              request: DeleteAgentlessPolicyRequestSchema,
              response: {
                200: {
                  description: 'OK: A successful request.',
                  body: () => DeleteAgentlessPolicyResponseSchema,
                },
                400: {
                  description: 'A bad request.',
                  body: genericErrorResponse,
                },
                409: {
                  description: 'A conflict occurred.',
                  body: genericErrorResponse,
                },
              },
            },
          },
          deleteAgentlessPolicyHandler
        )
  );

  // Bulk upgrade
  withDeprecatedAlias(
    {
      method: 'POST',
      canonicalPath: MANAGED_INTEGRATIONS_ROUTES.UPGRADE_PATTERN,
      deprecatedPath: AGENTLESS_POLICIES_ROUTES.UPGRADE_PATTERN,
      summary: 'Bulk upgrade managed integrations',
      description:
        "Upgrade multiple managed integrations to their installed package version, migrating each package policy's config onto the new schema. Always returns 200 with a per-policy result array; a missing id, or an id that is not a managed integration, is reported as a per-item failure (`success: false` + `statusCode`) without failing the batch, so valid ids are still upgraded. A successful result means the policy's saved object was upgraded, while the agentless deployment is reconciled asynchronously in the background. Policies already at the installed version are a genuine no-op: they still report `success: true` (calls stay idempotent) but nothing is re-persisted or redeployed. Note: agent-policy-level agentless settings (resources, ownership tags) are not re-derived from the new package version — use the update (PUT) endpoint for those.",
    },
    (routePath, { summary, description, tag }) =>
      router.versioned
        // @ts-ignore https://github.com/elastic/kibana/issues/203170
        .post({
          path: routePath,
          summary,
          description,
          options: {
            tags: [tag],
            availability: {
              since: '9.5.0',
              stability: 'experimental',
            },
          },
          fleetAuthz: {
            integrations: { writeIntegrationPolicies: true },
          },
        })
        .addVersion(
          {
            version: API_VERSIONS.public.v1,
            options: {
              oasOperationObject: () =>
                path.join(__dirname, 'examples/upgrade_managed_integrations.yaml'),
            },
            validate: {
              request: BulkUpgradeAgentlessPoliciesRequestSchema,
              response: {
                200: {
                  description: 'OK: A successful request.',
                  body: () => BulkUpgradeAgentlessPoliciesResponseSchema,
                },
                400: {
                  description: 'A bad request.',
                  body: genericErrorResponse,
                },
              },
            },
          },
          bulkUpgradeAgentlessPoliciesHandler
        )
  );

  // Bulk upgrade dry-run
  withDeprecatedAlias(
    {
      method: 'POST',
      canonicalPath: MANAGED_INTEGRATIONS_ROUTES.UPGRADE_DRYRUN_PATTERN,
      deprecatedPath: AGENTLESS_POLICIES_ROUTES.UPGRADE_DRYRUN_PATTERN,
      summary: 'Preview a managed integrations upgrade',
      description:
        'Preview upgrading multiple managed integrations without applying any change. Targets the installed package version by default; pass `pkgVersion` to preview a specific (for example, not-yet-installed) version. Each result returns the current/proposed version and any migration errors, plus — only on a clean dry-run (`hasErrors: false`) — the migrated `proposedPolicy`. `proposedPolicy` is for the edit-and-upgrade flow (edit it, then save via the update (PUT) endpoint); to apply an upgrade as-is, use `_upgrade`.',
    },
    (routePath, { summary, description, tag }) =>
      router.versioned
        // @ts-ignore https://github.com/elastic/kibana/issues/203170
        .post({
          path: routePath,
          summary,
          description,
          options: {
            tags: [tag],
            availability: {
              since: '9.5.0',
              stability: 'experimental',
            },
          },
          fleetAuthz: {
            integrations: { readIntegrationPolicies: true },
          },
        })
        .addVersion(
          {
            version: API_VERSIONS.public.v1,
            options: {
              oasOperationObject: () =>
                path.join(__dirname, 'examples/upgrade_managed_integrations_dryrun.yaml'),
            },
            validate: {
              request: AgentlessPolicyUpgradeDryRunRequestSchema,
              response: {
                200: {
                  description: 'OK: A successful request.',
                  body: () => AgentlessPolicyUpgradeDryRunResponseSchema,
                },
                400: {
                  description: 'A bad request.',
                  body: genericErrorResponse,
                },
              },
            },
          },
          upgradeAgentlessPoliciesDryRunHandler
        )
  );

  // Bulk throughput (internal, not aliased)
  router.versioned
    .post({
      path: MANAGED_INTEGRATIONS_ROUTES.BULK_THROUGHPUT_PATTERN,
      access: 'internal',
      summary: 'Get throughput for multiple managed integrations',
      description: 'Get 24h throughput data for a batch of managed integrations.',
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.AGENT_POLICIES.READ,
                FLEET_API_PRIVILEGES.AGENTS.READ,
              ],
            },
          ],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: GetBulkAgentlessPolicyThroughputRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetBulkAgentlessPolicyThroughputResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getBulkAgentlessPolicyThroughputHandler
    );
};
