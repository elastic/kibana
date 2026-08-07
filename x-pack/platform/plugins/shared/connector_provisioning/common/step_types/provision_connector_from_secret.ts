/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for the connector-provisioning step.
 */
export const ProvisionConnectorFromSecretStepTypeId =
  'connector-provisioning.provisionConnectorFromSecret';

/**
 * `{ path }`-only bindings auto-match every Vault field at that path against the
 * target connector type's own config/secrets field names by name. `{ path, field,
 * targetField }` bindings are an explicit override: read exactly one Vault field and
 * assign it to a specific target field, regardless of name. Modeled as an exact union
 * of two `.strict()` object schemas (rather than one object with optional `field`/
 * `targetField`) so a malformed partial entry -- e.g. `field` without `targetField` --
 * is rejected by schema validation, not silently misinterpreted.
 */
export const fieldBindingSchema = z
  .union([
    z.object({ path: z.string().min(1).max(1024) }).strict(),
    z
      .object({
        path: z.string().min(1).max(1024),
        field: z.string().min(1).max(256),
        targetField: z.string().min(1).max(256),
      })
      .strict(),
  ])
  .array()
  .max(50); // Bounded: caps the number of Vault reads a single step run can trigger.

export type FieldBinding = z.infer<typeof fieldBindingSchema>[number];

export const isExplicitFieldBinding = (
  binding: FieldBinding
): binding is Extract<FieldBinding, { targetField: string }> => 'targetField' in binding;

const literalFieldValueSchema = z.union([z.string().max(8192), z.number(), z.boolean()]);

export const InputSchema = z.object({
  vaultConnectorId: z.string().min(1).max(256),
  targetConnectorTypeId: z.string().min(1).max(256),
  targetConnectorName: z.string().min(1).max(256),
  authType: z.string().min(1).max(128).optional(),
  targetConnectorConfig: z
    .record(z.string().max(256), literalFieldValueSchema)
    .refine((o) => Object.keys(o).length <= 100, {
      message: 'targetConnectorConfig may have at most 100 entries',
    })
    .optional(),
  targetConnectorSecrets: z
    .record(z.string().max(256), literalFieldValueSchema)
    .refine((o) => Object.keys(o).length <= 100, {
      message: 'targetConnectorSecrets may have at most 100 entries',
    })
    .optional(),
  fieldBindings: fieldBindingSchema,
  mode: z.enum(['create', 'upsert']),
  targetConnectorId: z.string().min(1).max(256).optional(),
});

export const OutputSchema = z.object({
  connectorId: z.string(),
  action: z.enum(['created', 'updated']),
});

export type ProvisionConnectorFromSecretInput = z.infer<typeof InputSchema>;
export type ProvisionConnectorFromSecretOutput = z.infer<typeof OutputSchema>;

const EXAMPLE_YAML = `- name: provisionCloudConnector
  type: ${ProvisionConnectorFromSecretStepTypeId}
  with:
    vaultConnectorId: "hashicorp-vault-connector"
    targetConnectorTypeId: ".some_cloud_provider"
    targetConnectorName: "Cloud Provider - prod"
    authType: "oauth_client_credentials"
    targetConnectorConfig:
      region: "eu-west-1"                       # non-secret config, stored in cleartext
    targetConnectorSecrets:
      tokenUrl: "https://auth.cloudprovider.example/oauth/token"  # non-credential; stored cleartext in the workflow — never put a real secret here
    fieldBindings:
      - path: "secret/data/infra/cloud-prod" # auto-matches Vault fields to the target's secrets by name, e.g. clientId, clientSecret
    mode: upsert
    targetConnectorId: "cloud-provider-prod"`;

/**
 * Common step definition shared between server and (future) public implementations.
 * There is currently no public/UI-side registration for this step: it is designed to
 * run with no human in the loop, authored via the Workflows API/YAML directly rather
 * than the visual editor. See the connector-provisioning plan for the full rationale
 * and the security guarantees this step implements.
 */
export const provisionConnectorFromSecretCommonDefinition: CommonStepDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  id: ProvisionConnectorFromSecretStepTypeId,
  category: StepCategory.External,
  label: i18n.translate('connectorProvisioning.provisionConnectorFromSecret.label', {
    defaultMessage: 'Provision connector from secret',
  }),
  description: i18n.translate('connectorProvisioning.provisionConnectorFromSecret.description', {
    defaultMessage:
      'Reads one or more fields from a secret-resolving connector (e.g. HashiCorp Vault) and uses them to create or update a Kibana connector, without exposing the resolved values to workflow execution history, Agent Builder, or the HTTP execute API.',
  }),
  documentation: {
    details: i18n.translate(
      'connectorProvisioning.provisionConnectorFromSecret.documentation.details',
      {
        defaultMessage:
          'This step is the sole intended, statically-checked direct caller of the actions plugin\u2019s sensitive-output capability token: it reads fields via {readSecretAction} on the given Vault connector and writes them into a new or existing connector\u2019s secrets, but never returns the resolved values as step output. Vault-sourced values may only populate the target connector\u2019s secrets fields (never a cleartext config field). {configInput} and {secretsInput} are literals stored in cleartext in the workflow and its execution history, so only use them for non-sensitive, structural values \u2014 put real credentials in Vault.',
        values: {
          readSecretAction: '`readSecret`',
          configInput: '`targetConnectorConfig`',
          secretsInput: '`targetConnectorSecrets`',
        },
      }
    ),
    examples: [
      `## Provision a connector from Vault-sourced fields\n\`\`\`yaml\n${EXAMPLE_YAML}\n\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
