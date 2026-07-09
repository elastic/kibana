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
import { AGENTLESS_POLICIES_ROUTES, API_VERSIONS } from '../../../common/constants';
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

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      enableQueryVersion: true,
      path: AGENTLESS_POLICIES_ROUTES.SYNC_PATTERN,
      summary: 'Sync agentless policies',
      description: 'Sync agentless policies',
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
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .post({
      path: AGENTLESS_POLICIES_ROUTES.CREATE_PATTERN,
      summary: 'Create an agentless policy',
      description: 'Create an agentless policy',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
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
          oasOperationObject: () => path.join(__dirname, 'examples/create_agentless_policies.yaml'),
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
    );

  // List
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .get({
      path: AGENTLESS_POLICIES_ROUTES.LIST_PATTERN,
      summary: 'Get agentless policies',
      description: 'List agentless policies',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
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
          oasOperationObject: () => path.join(__dirname, 'examples/list_agentless_policies.yaml'),
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
    );

  // Get
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .get({
      path: AGENTLESS_POLICIES_ROUTES.GET_PATTERN,
      summary: 'Get an agentless policy',
      description: 'Get an agentless policy by ID',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
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
          oasOperationObject: () => path.join(__dirname, 'examples/get_agentless_policy.yaml'),
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
              description: 'The agentless policy was not found.',
              body: notFoundResponse,
            },
          },
        },
      },
      getAgentlessPolicyHandler
    );

  // Update
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .put({
      path: AGENTLESS_POLICIES_ROUTES.UPDATE_PATTERN,
      summary: 'Update an agentless policy',
      description:
        'Update an agentless policy by ID. Uses full-replace semantics: the policy is rebuilt entirely from the request body, so any omitted optional field (for example, `description`, `vars`, `global_data_tags`, `cloud_connector`) is cleared or reset to its default. The integration package name is immutable and the runtime-managed `cluster_id` is preserved from the existing policy.',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
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
          oasOperationObject: () => path.join(__dirname, 'examples/update_agentless_policy.yaml'),
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
              description: 'The agentless policy was not found.',
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
    );

  // Delete
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .delete({
      path: AGENTLESS_POLICIES_ROUTES.DELETE_PATTERN,
      summary: 'Delete an agentless policy',
      description: 'Delete an agentless policy',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
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
          oasOperationObject: () => path.join(__dirname, 'examples/delete_agentless_policies.yaml'),
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
    );

  // Bulk upgrade
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .post({
      path: AGENTLESS_POLICIES_ROUTES.UPGRADE_PATTERN,
      summary: 'Bulk upgrade agentless policies',
      description:
        "Upgrade multiple agentless policies to their installed package version, migrating each package policy's config onto the new schema. Always returns 200 with a per-policy result array; a missing or non-agentless id is reported as a per-item failure (`success: false` + `statusCode`) without failing the batch, so valid ids are still upgraded. A successful result means the policy's saved object was upgraded, while the agentless deployment is reconciled asynchronously in the background. Policies already at the installed version are a genuine no-op: they still report `success: true` (calls stay idempotent) but nothing is re-persisted or redeployed. Note: agent-policy-level agentless settings (resources, ownership tags) are not re-derived from the new package version — use the update (PUT) endpoint for those.",
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
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
            path.join(__dirname, 'examples/upgrade_agentless_policies.yaml'),
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
    );

  // Bulk upgrade dry-run
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .post({
      path: AGENTLESS_POLICIES_ROUTES.UPGRADE_DRYRUN_PATTERN,
      summary: 'Preview an agentless policies upgrade',
      description:
        'Preview upgrading multiple agentless policies without applying any change. Targets the installed package version by default; pass `pkgVersion` to preview a specific (for example, not-yet-installed) version. Each result returns the current/proposed version and any migration errors, plus — only on a clean dry-run (`hasErrors: false`) — the migrated `proposedPolicy`. `proposedPolicy` is for the edit-and-upgrade flow (edit it, then save via the update (PUT) endpoint); to apply an upgrade as-is, use `_upgrade`.',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
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
            path.join(__dirname, 'examples/upgrade_agentless_policies_dryrun.yaml'),
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
    );

  // Bulk throughput
  router.versioned
    .post({
      path: AGENTLESS_POLICIES_ROUTES.BULK_THROUGHPUT_PATTERN,
      access: 'internal',
      summary: 'Get throughput for multiple agentless policies',
      description: 'Get 24h throughput data for a batch of agentless integration policies.',
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
