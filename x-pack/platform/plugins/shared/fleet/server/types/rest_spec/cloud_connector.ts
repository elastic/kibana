/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../common/constants';

import { MAX_IAC_RENDER_INTEGRATIONS, RenderIacTemplateIntegrationSchema } from './iac_provisioner';

const IAC_FIELD_AVAILABILITY = {
  stability: 'experimental' as const,
  since: '9.6.0',
};

const IacRequestFieldsSchema = {
  iac_key: schema.maybe(
    schema.nullable(
      schema.string({
        minLength: 1,
        maxLength: 512,
        meta: {
          description:
            'Checksum of the CloudFormation template last saved on this connector. Set to null to remove it.',
          availability: IAC_FIELD_AVAILABILITY,
        },
      })
    )
  ),
  iac_blueprint_id: schema.maybe(
    schema.nullable(
      schema.string({
        minLength: 1,
        maxLength: 255,
        meta: {
          description:
            'Identifier of the template source last used for this connector. Set to null to remove it.',
          availability: IAC_FIELD_AVAILABILITY,
        },
      })
    )
  ),
  iac_blueprint_version: schema.maybe(
    schema.nullable(
      schema.string({
        minLength: 1,
        maxLength: 64,
        meta: {
          description:
            'Version of the template source last used for this connector. Set to null to remove it.',
          availability: IAC_FIELD_AVAILABILITY,
        },
      })
    )
  ),
  iac_deployment_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 2048,
      meta: {
        description: 'Identifier of the last CloudFormation stack deployed for this connector.',
        availability: IAC_FIELD_AVAILABILITY,
      },
    })
  ),
};

const IacStoredFieldsSchema = {
  ...IacRequestFieldsSchema,
  iac_upgrade_status: schema.maybe(
    schema.oneOf([schema.literal('up_to_date'), schema.literal('upgrade_available')], {
      meta: {
        description: 'Whether a newer CloudFormation template is available for this connector.',
        availability: IAC_FIELD_AVAILABILITY,
      },
    })
  ),
  iac_upgrade_checked_at: schema.maybe(
    schema.string({
      meta: {
        description: 'When this connector was last checked for a CloudFormation template upgrade.',
        availability: IAC_FIELD_AVAILABILITY,
      },
    })
  ),
};

export const CreateCloudConnectorRequestSchema = {
  body: schema.object({
    name: schema.string({
      minLength: 1,
      maxLength: 255,
      meta: { description: 'The name of the cloud connector.' },
    }),
    cloudProvider: schema.oneOf(
      [schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')],
      {
        meta: { description: 'The cloud provider type: aws, azure, or gcp.' },
      }
    ),
    accountType: schema.maybe(
      schema.oneOf([schema.literal(SINGLE_ACCOUNT), schema.literal(ORGANIZATION_ACCOUNT)], {
        meta: {
          description:
            'The account type: single-account (single account/subscription) or organization-account (organization-wide).',
        },
      })
    ),
    vars: schema.recordOf(
      schema.string({ minLength: 1, maxLength: 100 }),
      schema.oneOf([
        schema.string({ maxLength: 1000 }),
        schema.number(),
        schema.boolean(),
        schema.object({
          type: schema.string({ maxLength: 50 }),
          value: schema.oneOf([
            schema.string({ maxLength: 1000 }),
            schema.object({
              isSecretRef: schema.boolean(),
              id: schema.string({ maxLength: 255 }),
            }),
          ]),
          frozen: schema.maybe(schema.boolean()),
        }),
      ])
    ),
    ...IacRequestFieldsSchema,
  }),
};

// Schema for response vars - using recordOf for flexible OpenAPI generation
// The actual structure varies based on cloudProvider (AWS vs Azure), so we use a flexible schema
const CloudConnectorResponseVarsSchema = schema.recordOf(schema.string(), schema.any());

const VerificationFieldsSchema = {
  verification_status: schema.maybe(schema.string()),
  verification_started_at: schema.maybe(schema.string()),
  verification_failed_at: schema.maybe(schema.string()),
};

export const CreateCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    accountType: schema.maybe(schema.string()),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
    ...VerificationFieldsSchema,
    ...IacStoredFieldsSchema,
  }),
});

export const GetCloudConnectorsRequestSchema = {
  query: schema.object({
    page: schema.maybe(
      schema.string({
        meta: { description: 'The page number for pagination.' },
      })
    ),
    perPage: schema.maybe(
      schema.string({
        meta: { description: 'The number of items per page.' },
      })
    ),
    kuery: schema.maybe(
      schema.string({
        meta: { description: 'KQL query to filter cloud connectors.' },
      })
    ),
  }),
};

export const GetCloudConnectorsResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      id: schema.string(),
      name: schema.string(),
      namespace: schema.maybe(schema.string()),
      cloudProvider: schema.string(),
      accountType: schema.maybe(schema.string()),
      vars: CloudConnectorResponseVarsSchema,
      packagePolicyCount: schema.number(),
      created_at: schema.string(),
      updated_at: schema.string(),
      ...VerificationFieldsSchema,
      ...IacStoredFieldsSchema,
    }),
    { maxSize: 10000 }
  ),
});

export const GetCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector.' },
    }),
  }),
};

export const GetCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    accountType: schema.maybe(schema.string()),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
    ...VerificationFieldsSchema,
    ...IacStoredFieldsSchema,
  }),
});

export const DeleteCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector to delete.' },
    }),
  }),
  query: schema.object({
    force: schema.maybe(
      schema.boolean({
        meta: { description: 'If true, forces deletion even if the cloud connector is in use.' },
      })
    ),
  }),
};

export const DeleteCloudConnectorResponseSchema = schema.object({
  id: schema.string(),
});

export const UpdateCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector to update.' },
    }),
  }),
  body: schema.object({
    name: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 255,
        meta: { description: 'The name of the cloud connector.' },
      })
    ),
    accountType: schema.maybe(
      schema.oneOf([schema.literal(SINGLE_ACCOUNT), schema.literal(ORGANIZATION_ACCOUNT)], {
        meta: {
          description:
            'The account type: single-account (single account/subscription) or organization-account (organization-wide).',
        },
      })
    ),
    vars: schema.maybe(
      schema.recordOf(
        schema.string({ minLength: 1, maxLength: 100 }),
        schema.oneOf([
          schema.string({ maxLength: 1000 }),
          schema.number(),
          schema.boolean(),
          schema.object({
            type: schema.string({ maxLength: 50 }),
            value: schema.oneOf([
              schema.string({ maxLength: 1000 }),
              schema.object({
                isSecretRef: schema.boolean(),
                id: schema.string({ maxLength: 255 }),
              }),
            ]),
            frozen: schema.maybe(schema.boolean()),
          }),
        ])
      )
    ),
    ...IacRequestFieldsSchema,
  }),
};

export const UpdateCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    accountType: schema.maybe(schema.string()),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
    ...VerificationFieldsSchema,
    ...IacStoredFieldsSchema,
  }),
});

export const GetCloudConnectorUsageRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector.' },
    }),
  }),
  query: schema.object({
    page: schema.maybe(
      schema.number({
        min: 1,
        meta: { description: 'The page number for pagination.' },
      })
    ),
    perPage: schema.maybe(
      schema.number({
        min: 1,
        meta: { description: 'The number of items per page.' },
      })
    ),
  }),
};

export const GetCloudConnectorUsageResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      id: schema.string(),
      name: schema.string(),
      package: schema.maybe(
        schema.object({
          name: schema.string(),
          title: schema.string(),
          version: schema.string(),
        })
      ),
      policy_ids: schema.arrayOf(schema.string(), { maxSize: 10000 }),
      created_at: schema.string(),
      updated_at: schema.string(),
    }),
    { maxSize: 10000 }
  ),
  total: schema.number(),
  page: schema.number(),
  perPage: schema.number(),
});

export const VerifyCloudConnectorIacKeyRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      maxLength: 255,
      meta: { description: 'The unique identifier of the cloud connector.' },
    }),
  }),
  body: schema.object({
    // The integrations being added carry the same shape the render route takes: per package,
    // the policy templates the user enabled, with only the inputs they enabled. Omitted or
    // empty means "check the connector's current set only" (flyout). The size limit matches
    // the render route because the merged set this route returns is re-rendered as-is.
    integrations: schema.maybe(
      schema.arrayOf(RenderIacTemplateIntegrationSchema, { maxSize: MAX_IAC_RENDER_INTEGRATIONS })
    ),
    // Telemetry label for the UI asking. The wizard and the AWS onboarding both add
    // integrations, so only the browser can tell them apart; 'flyout' is derived from an
    // empty/omitted set and is not accepted here.
    surface: schema.maybe(schema.oneOf([schema.literal('wizard'), schema.literal('onboarding')])),
  }),
};

export const VerifyCloudConnectorIacKeyResponseSchema = schema.object({
  matches: schema.boolean(),
  reason: schema.maybe(schema.oneOf([schema.literal('no_key'), schema.literal('key_mismatch')])),
  // `matches` is true for both a definite match and a check that could not run (fail open);
  // `outcome` lets the flyout hide its upgrade callout only on the former.
  outcome: schema.oneOf([
    schema.literal('matches'),
    schema.literal('no_key'),
    schema.literal('key_mismatch'),
    schema.literal('unsupported_provider'),
    schema.literal('no_integrations'),
    schema.literal('key_unavailable'),
  ]),
  deploymentId: schema.maybe(schema.string()),
  region: schema.maybe(schema.string()),
  // Same shape the render route takes, so the browser can re-render exactly this set.
  integrations: schema.arrayOf(RenderIacTemplateIntegrationSchema),
});
