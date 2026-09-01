/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

import { SO_SEARCH_LIMIT } from '../../constants';

import { SimplifiedCreatePackagePolicyRequestBodySchema } from '../models/package_policy_schema';
import {
  AgentlessPolicySchema,
  AgentlessPolicyResponseSchema,
} from '../models/agentless_policy_schema';
import type { AgentlessPolicy } from '../models/agentless_policy';

import type { ListResult } from './common';

export const CreateAgentlessPolicyRequestSchema = {
  body: SimplifiedCreatePackagePolicyRequestBodySchema.extends(
    {
      // Remove all properties that are not relevant for managed integrations
      policy_id: undefined,
      policy_ids: undefined,
      supports_agentless: undefined,
      output_id: undefined,
      condition: undefined,
      policy_template: schema.maybe(
        schema.string({
          maxLength: 256,
          meta: {
            description:
              'The policy template to use for the managed integration. If not provided, the default policy template is used.',
          },
        })
      ),
      // Only available for managed integrations.
      // On standard package policies this field is rejected by server-side validation.
      global_data_tags: schema.maybe(
        schema.arrayOf(
          schema.object({
            name: schema.string({
              maxLength: 1024,
              meta: { description: 'Name of the custom field. The name cannot contain spaces.' },
            }),
            value: schema.oneOf([schema.string({ maxLength: 1024 }), schema.number()], {
              meta: { description: 'Value of the custom field.' },
            }),
          }),
          {
            maxSize: 100,
          }
        )
      ),
      // Cloud connector configuration - all connector settings go here.
      // Optional AND accepts an explicit `null` so a GET response round-trips cleanly into a
      // PUT/POST: the GET mapper emits `cloud_connector: null` when no connector is attached, and
      // `null` is treated the same as omitted (no connector / detach on update).
      cloud_connector: schema.maybe(
        schema.oneOf([
          schema.literal(null),
          schema.object(
            {
              enabled: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'Set to `true` to attach a cloud connector to this policy. Must be `true` to set any of `cloud_connector_id`, `name`, or `target_csp`.',
                },
              }),
              cloud_connector_id: schema.maybe(
                schema.string({
                  maxLength: 256,
                  meta: {
                    description:
                      'ID of an existing cloud connector to reuse. If not provided, a new connector is created. Requires `enabled: true` and cannot be combined with `name`.',
                  },
                })
              ),
              name: schema.maybe(
                schema.string({
                  minLength: 1,
                  maxLength: 255,
                  meta: {
                    description:
                      'Name for a new cloud connector. If not provided, a name is generated automatically from the credentials. Requires `enabled: true` and only applies when creating a new connector (cannot be combined with `cloud_connector_id`).',
                  },
                })
              ),
              target_csp: schema.maybe(
                schema.oneOf(
                  [schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')],
                  {
                    meta: {
                      description:
                        'Target cloud service provider. If not provided, the provider is detected automatically from the inputs. Requires `enabled: true`.',
                    },
                  }
                )
              ),
            },
            {
              validate: ({ enabled, cloud_connector_id: id, name, target_csp: targetCsp }) => {
                // `enabled` defaults to false, so a body like `{ cloud_connector_id: 'X' }` would
                // silently detach the connector despite the caller clearly intending to attach it.
                // Reject the attach-only fields unless `enabled` is explicitly true to surface the
                // contradiction as a 400 instead of a silent no-op.
                if (!enabled && (id || name || targetCsp)) {
                  return 'cloud_connector.enabled must be true to set cloud_connector_id, name, or target_csp';
                }
                // `cloud_connector_id` selects an existing connector to reuse; `name` only applies
                // when creating a new one, so it is silently ignored alongside an id. Reject the
                // combination rather than dropping `name` without feedback.
                if (id && name) {
                  return 'cloud_connector.name cannot be set together with cloud_connector_id (name only applies when creating a new connector)';
                }
              },
            }
          ),
        ])
      ),
    },
    // Distinct meta.id so this extension does not silently overwrite the
    // `simplified_create_package_policy_request` named component in the OAS
    // shared schemas map. ObjectType.extends() inherits `meta.id` from the
    // base when the caller does not provide a fresh one, and the OAS bundler's
    // shared registry is last-write-wins on collisions.
    { meta: { id: 'create_managed_integration_request' } }
  ),
};

export const UpdateAgentlessPolicyRequestSchema = {
  params: schema.object({
    policyId: schema.string({
      maxLength: 256,
      meta: {
        description: 'The ID of the managed integration to update.',
      },
    }),
  }),
  // PUT uses full-replace semantics with the exact same body contract as POST
  //
  // Two inherited create-only fields are accepted but intentionally ignored on
  // update (kept in the body purely to share the schema/OAS component with POST):
  //  - `id`: the target is identified by the `policyId`
  //  - `create_dataset_templates`: a create-time install flag for dataset index
  //    templates; `packagePolicyService.update` has no equivalent option, so the
  //    service never forwards it on update.
  body: CreateAgentlessPolicyRequestSchema.body,
};

export const DeleteAgentlessPolicyRequestSchema = {
  query: schema.object({
    force: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Force delete the policy even if the policy is managed.',
        },
      })
    ),
  }),
  params: schema.object({
    policyId: schema.string({
      maxLength: 256,
      meta: {
        description: 'The ID of the policy to delete.',
      },
    }),
  }),
};

export const DeleteAgentlessPolicyResponseSchema = schema.object(
  {
    id: schema.string({
      meta: {
        description: 'The ID of the deleted managed integration.',
      },
    }),
  },
  {
    meta: {
      description: 'Response for deleting a managed integration.',
    },
  }
);

export const CreateAgentlessPolicyResponseSchema = AgentlessPolicyResponseSchema;

export type CreateAgentlessPolicyResponse = TypeOf<typeof CreateAgentlessPolicyResponseSchema>;

export interface CreateAgentlessPolicyRequest {
  body: TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>;
}

/**
 * Request body for creating a managed integration.
 *
 * Derived from the route schema so it always reflects the accepted contract: a
 * `cloud_connector` may carry `name`/`target_csp` when creating a new connector
 * (instead of `cloud_connector_id`), and `package.title` is not required.
 */
export type NewAgentlessPolicy = CreateAgentlessPolicyRequest['body'];

/**
 * Request for updating a managed integration.
 *
 * `body` reuses the create contract (full-replace PUT), so it stays in sync with
 * {@link NewAgentlessPolicy}. The response is the unified {@link AgentlessPolicy}
 * envelope shared with create/get.
 */
export interface UpdateAgentlessPolicyRequest {
  params: TypeOf<typeof UpdateAgentlessPolicyRequestSchema.params>;
  body: TypeOf<typeof UpdateAgentlessPolicyRequestSchema.body>;
}

export type UpdateAgentlessPolicyResponse = TypeOf<typeof AgentlessPolicyResponseSchema>;

export type DeleteAgentlessPolicyResponse = TypeOf<typeof DeleteAgentlessPolicyResponseSchema>;

export interface DeleteAgentlessPolicyRequest {
  params: TypeOf<typeof DeleteAgentlessPolicyRequestSchema.params>;
  query: TypeOf<typeof DeleteAgentlessPolicyRequestSchema.query>;
}

export const AgentlessPolicyThroughputSchema = schema.object({
  policyId: schema.string({
    maxLength: 256,
    meta: { description: 'The ID of the managed integration.' },
  }),
  averagePerSecond: schema.number({
    meta: { description: 'Average ingest rate over the observed span in events per second.' },
  }),
  series: schema.arrayOf(
    schema.object({
      x: schema.number({ meta: { description: 'Bucket start timestamp in epoch milliseconds.' } }),
      y: schema.number({
        meta: { description: 'Peak events per second in this 30-minute bucket.' },
      }),
    }),
    { maxSize: 256, meta: { description: '30-minute throughput buckets over the last 24h.' } }
  ),
});

export const GetBulkAgentlessPolicyThroughputRequestSchema = {
  body: schema.object({
    policyIds: schema.arrayOf(schema.string({ maxLength: 500 }), {
      maxSize: SO_SEARCH_LIMIT,
      meta: { description: 'IDs of the managed integrations to query.' },
    }),
  }),
};

export const GetBulkAgentlessPolicyThroughputResponseSchema = schema.object({
  items: schema.arrayOf(AgentlessPolicyThroughputSchema, {
    maxSize: SO_SEARCH_LIMIT,
    meta: { description: 'Throughput data for each requested policy.' },
  }),
});

export type AgentlessPolicyThroughput = TypeOf<typeof AgentlessPolicyThroughputSchema>;
export type GetBulkAgentlessPolicyThroughputResponse = TypeOf<
  typeof GetBulkAgentlessPolicyThroughputResponseSchema
>;

/**
 * Params validation schema for the GET-by-id endpoint.
 *
 * Lives here in `common/` (matching the Create/Delete endpoints in this file) so
 * `server/` imports it for route registration and `common/` carries no dependency
 * on `server/`.
 */
export const GetAgentlessPolicyRequestSchema = {
  params: schema.object({
    policyId: schema.string({
      maxLength: 256,
      meta: {
        description: 'The ID of the managed integration to retrieve.',
      },
    }),
  }),
};

export type GetAgentlessPolicyResponse = TypeOf<typeof AgentlessPolicyResponseSchema>;

/**
 * Base query shape for the LIST endpoint.
 *
 * Defined here so the {@link ListAgentlessPoliciesRequest} type can be derived from it via `TypeOf`.
 * The `kuery` validator is intentionally omitted: it depends on the server-only `validateKuery`,
 * so `server/types/rest_spec/agentless_policy.ts` `.extends()` this schema to attach it.
 */
export const ListAgentlessPoliciesRequestQuerySchema = schema.object({
  // Paging defaults (page=1, perPage=20) are owned by the service layer
  // (`listAgentlessPolicies`), which is the single source of truth
  page: schema.maybe(schema.number({ meta: { description: 'Page number. Defaults to `1`.' } })),
  perPage: schema.maybe(
    schema.number({ meta: { description: 'Number of results per page. Defaults to `20`.' } })
  ),
  sortField: schema.maybe(
    schema.string({
      maxLength: 256,
      meta: { description: 'Field to sort results by. Defaults to `updated_at`.' },
    })
  ),
  sortOrder: schema.maybe(
    schema.oneOf([schema.literal('desc'), schema.literal('asc')], {
      meta: { description: 'Sort order, ascending or descending. Defaults to `desc`.' },
    })
  ),
  kuery: schema.maybe(
    schema.string({
      maxLength: 4096,
      meta: { description: 'A KQL query string to filter results.' },
    })
  ),
});

export interface ListAgentlessPoliciesRequest {
  query: TypeOf<typeof ListAgentlessPoliciesRequestQuerySchema>;
}

export type ListAgentlessPoliciesResponse = ListResult<AgentlessPolicy>;

/**
 * Request body shared by the bulk upgrade and the upgrade dry-run endpoints.
 *
 * Only `policyIds` is accepted: the target is always the *installed* package version
 * (mirrors the package-policy bulk upgrade default), so no explicit `pkgVersion` is
 * exposed. Stays in agentless vocabulary (`policyIds`, matching the `bulk_throughput`
 * endpoint) rather than the package-policy `packagePolicyIds` wording.
 */
export const BulkUpgradeAgentlessPoliciesRequestSchema = {
  body: schema.object(
    {
      policyIds: schema.arrayOf(schema.string({ maxLength: 256 }), {
        maxSize: 1000,
        meta: {
          description:
            'IDs of the managed integrations to upgrade to their installed package version.',
        },
      }),
    },
    { meta: { id: 'bulk_upgrade_managed_integrations_request' } }
  ),
};

/**
 * Request body for the upgrade dry-run endpoint. Extends the bulk-upgrade body with an
 * optional `pkgVersion` so callers can preview a migration to a *not-yet-installed* target
 * version — the UI upgrade flow computes the preview before installing the new package
 * (mirrors the package-policy dry-run's `packageVersion`). When omitted, the target
 * defaults to the installed package version.
 */
export const AgentlessPolicyUpgradeDryRunRequestSchema = {
  body: schema.object(
    {
      policyIds: schema.arrayOf(schema.string({ maxLength: 256 }), {
        maxSize: 1000,
        meta: {
          description: 'IDs of the managed integrations to preview upgrading.',
        },
      }),
      pkgVersion: schema.maybe(
        schema.string({
          maxLength: 256,
          meta: {
            description:
              'Target package version to preview the upgrade against. Defaults to the installed package version.',
          },
        })
      ),
    },
    { meta: { id: 'managed_integration_upgrade_dry_run_request' } }
  ),
};

/**
 * Per-policy result of a bulk upgrade. Mirrors the package-policy
 * `UpgradePackagePolicyResponseItem`: a `success` flag plus an optional
 * `statusCode`/`body` carrying the per-policy failure. As with package-policy,
 * `success: true` means the policy's saved object was upgraded; the live agentless
 * workload is reconciled asynchronously by a background deploy task (with the
 * deployment-sync task as a backstop), so success does not guarantee the workload
 * is already running the new version.
 */
export const BulkUpgradeAgentlessPolicyResultSchema = schema.object(
  {
    id: schema.string({
      maxLength: 256,
      meta: { description: 'The ID of the managed integration.' },
    }),
    name: schema.maybe(
      schema.string({
        maxLength: 256,
        meta: { description: 'The name of the managed integration.' },
      })
    ),
    success: schema.boolean({
      meta: {
        description:
          "Whether the policy's saved object was upgraded successfully. The live workload is reconciled asynchronously in the background.",
      },
    }),
    statusCode: schema.maybe(
      schema.number({
        meta: { description: 'HTTP-like status code when the upgrade failed for this policy.' },
      })
    ),
    body: schema.maybe(
      schema.object({
        message: schema.string({
          maxLength: 4096,
          meta: { description: 'Error message when the upgrade failed for this policy.' },
        }),
      })
    ),
  },
  { meta: { id: 'bulk_upgrade_managed_integration_result' } }
);

export const BulkUpgradeAgentlessPoliciesResponseSchema = schema.arrayOf(
  BulkUpgradeAgentlessPolicyResultSchema,
  { maxSize: 10000 }
);

/**
 * Per-policy result of an upgrade dry-run. Rather than leaking the raw Fleet-internal
 * `[PackagePolicy, DryRunPackagePolicy]` diff, it summarizes the change via
 * `currentVersion`/`proposedVersion` and `hasErrors`/`errors`. Only on a clean dry-run
 * (`hasErrors: false`) does it also include the migrated config as a clean {@link AgentlessPolicy}
 * in `proposedPolicy`, meant to be edited and saved via the agentless PUT — not applied as-is
 * (to apply an upgrade untouched, use `_upgrade`). On error, `proposedPolicy` is omitted.
 */
export const AgentlessPolicyUpgradeDryRunResultSchema = schema.object(
  {
    id: schema.string({
      maxLength: 256,
      meta: { description: 'The ID of the managed integration.' },
    }),
    name: schema.maybe(
      schema.string({
        maxLength: 256,
        meta: { description: 'The name of the managed integration.' },
      })
    ),
    hasErrors: schema.boolean({
      meta: { description: 'Whether the dry-run migration produced any errors.' },
    }),
    currentVersion: schema.maybe(
      schema.string({
        maxLength: 256,
        meta: { description: 'The current installed package version of the policy.' },
      })
    ),
    proposedVersion: schema.maybe(
      schema.string({
        maxLength: 256,
        meta: { description: 'The package version the policy would be upgraded to.' },
      })
    ),
    // Returned only when the dry-run is clean (`hasErrors: false`); omitted on migration errors.
    // Intended for the edit-and-upgrade flow (edit it, then submit via PUT), not a no-edit apply
    // of `_upgrade`. See the schema-level doc comment above for the full contract.
    proposedPolicy: schema.maybe(AgentlessPolicySchema),
    errors: schema.maybe(
      schema.arrayOf(
        schema.object({
          message: schema.string({
            maxLength: 4096,
            meta: { description: 'Human-readable migration error.' },
          }),
        }),
        {
          maxSize: 1000,
          meta: { description: 'Migration errors encountered while computing the upgrade.' },
        }
      )
    ),
    statusCode: schema.maybe(
      schema.number({
        meta: { description: 'HTTP-like status code when the dry-run failed for this policy.' },
      })
    ),
    body: schema.maybe(
      schema.object({
        message: schema.string({
          maxLength: 4096,
          meta: { description: 'Error message when the dry-run failed for this policy.' },
        }),
      })
    ),
  },
  { meta: { id: 'managed_integration_upgrade_dry_run_result' } }
);

export const AgentlessPolicyUpgradeDryRunResponseSchema = schema.arrayOf(
  AgentlessPolicyUpgradeDryRunResultSchema,
  { maxSize: 10000 }
);

export interface BulkUpgradeAgentlessPoliciesRequest {
  body: TypeOf<typeof BulkUpgradeAgentlessPoliciesRequestSchema.body>;
}

export type BulkUpgradeAgentlessPolicyResult = TypeOf<
  typeof BulkUpgradeAgentlessPolicyResultSchema
>;

export type BulkUpgradeAgentlessPoliciesResponse = TypeOf<
  typeof BulkUpgradeAgentlessPoliciesResponseSchema
>;

export type AgentlessPolicyUpgradeDryRunResult = TypeOf<
  typeof AgentlessPolicyUpgradeDryRunResultSchema
>;

export type AgentlessPolicyUpgradeDryRunResponse = TypeOf<
  typeof AgentlessPolicyUpgradeDryRunResponseSchema
>;
