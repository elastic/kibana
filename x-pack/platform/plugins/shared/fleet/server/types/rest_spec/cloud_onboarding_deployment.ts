/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// --- Shared primitives ---

const CloudOnboardingDeploymentProviderSchema = schema.oneOf(
  [schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')],
  { meta: { description: 'Cloud provider.' } }
);

const CloudOnboardingDeploymentMechanismSchema = schema.oneOf(
  [
    schema.literal('identity_federation'),
    schema.literal('firehose'),
    schema.literal('cloud_forwarder'),
  ],
  {
    meta: { description: 'Delivery mechanism: identity_federation, firehose, or cloud_forwarder.' },
  }
);

const CloudOnboardingDeploymentStatusSchema = schema.oneOf(
  [
    schema.literal('pending'),
    schema.literal('deploying'),
    schema.literal('succeeded'),
    schema.literal('failed'),
  ],
  { meta: { description: 'Deployment status.' } }
);

// Request-body variants enforce minLength: 1 on record keys.
const RequestVarsSchema = schema.recordOf(schema.string({ minLength: 1 }), schema.string(), {
  meta: { description: 'Deployment-level plaintext config.' },
});

const ServiceVarsEntrySchema = schema.arrayOf(schema.recordOf(schema.string(), schema.any()), {
  maxSize: 100,
});

const RequestServiceVarsSchema = schema.recordOf(
  schema.string({ minLength: 1 }),
  ServiceVarsEntrySchema,
  { meta: { description: 'Per-service source configs.' } }
);

const RequestSecretsSchema = schema.recordOf(schema.string({ minLength: 1 }), schema.string(), {
  meta: { description: 'Deployment-level encrypted secrets (e.g. external_id).' },
});

const DeploymentIdParamSchema = schema.object({
  deploymentId: schema.string({
    meta: { description: 'The unique identifier of the cloud onboarding deployment.' },
  }),
});

// --- Item schema (response only — secrets intentionally excluded) ---

const CloudOnboardingDeploymentItemSchema = schema.object({
  id: schema.string(),
  provider: CloudOnboardingDeploymentProviderSchema,
  connectionId: schema.string({
    meta: { description: 'ID of the fleet-cloud-connector this deployment belongs to.' },
  }),
  mechanisms: schema.arrayOf(CloudOnboardingDeploymentMechanismSchema, { maxSize: 10 }),
  deploymentId: schema.maybe(
    schema.string({
      meta: { description: 'Opaque deployment identifier; for AWS, the CFN stack ARN.' },
    })
  ),
  deploymentName: schema.maybe(
    schema.string({ meta: { description: 'Opaque deployment name; for AWS, the CFN stack name.' } })
  ),
  services: schema.arrayOf(schema.string(), {
    maxSize: 1000,
    meta: { description: 'Service IDs covered by this deployment.' },
  }),
  status: CloudOnboardingDeploymentStatusSchema,
  statusMessage: schema.maybe(
    schema.string({ meta: { description: 'Error context when status is failed.' } })
  ),
  attemptCount: schema.maybe(
    schema.number({
      min: 1,
      meta: { description: 'Number of deployment attempts, including the current one.' },
    })
  ),
  vars: schema.maybe(
    schema.recordOf(schema.string(), schema.string(), {
      meta: { description: 'Deployment-level plaintext config (e.g. role_arn, api_key_id).' },
    })
  ),
  serviceVars: schema.maybe(
    schema.recordOf(schema.string(), ServiceVarsEntrySchema, {
      meta: {
        description:
          'Per-service config keyed by service ID. Each entry is an array of source configs (regions, S3 bucket ARN, etc.).',
      },
    })
  ),
  packagePolicyIds: schema.maybe(
    schema.arrayOf(schema.string(), {
      maxSize: 100,
      meta: {
        description:
          'Package policy IDs created for agentless services. Present only when identity_federation is in mechanisms.',
      },
    })
  ),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});

const SingleItemResponseSchema = schema.object({ item: CloudOnboardingDeploymentItemSchema });

// --- Public schemas ---

export const CreateCloudOnboardingDeploymentRequestSchema = {
  body: schema.object({
    provider: CloudOnboardingDeploymentProviderSchema,
    connectionId: schema.string({
      minLength: 1,
      meta: { description: 'ID of the fleet-cloud-connector to associate with this deployment.' },
    }),
    mechanisms: schema.arrayOf(CloudOnboardingDeploymentMechanismSchema, {
      maxSize: 10,
      meta: { description: 'Delivery mechanisms active in this deployment.' },
    }),
    services: schema.arrayOf(schema.string({ minLength: 1 }), {
      maxSize: 1000,
      meta: { description: 'Service IDs to be covered by this deployment.' },
    }),
    vars: schema.maybe(RequestVarsSchema),
    serviceVars: schema.maybe(RequestServiceVarsSchema),
    secrets: schema.maybe(RequestSecretsSchema),
  }),
};

export const CreateCloudOnboardingDeploymentResponseSchema = SingleItemResponseSchema;

export const GetCloudOnboardingDeploymentRequestSchema = { params: DeploymentIdParamSchema };

export const GetCloudOnboardingDeploymentResponseSchema = SingleItemResponseSchema;

export const GetCloudOnboardingDeploymentsByConnectionIdRequestSchema = {
  params: schema.object({
    connectionId: schema.string({
      meta: { description: 'The fleet-cloud-connector ID to list deployments for.' },
    }),
  }),
};

export const GetCloudOnboardingDeploymentsByConnectionIdResponseSchema = schema.object({
  items: schema.arrayOf(CloudOnboardingDeploymentItemSchema, { maxSize: 100 }),
});

export const UpdateCloudOnboardingDeploymentRequestSchema = {
  params: DeploymentIdParamSchema,
  body: schema.object({
    status: schema.maybe(CloudOnboardingDeploymentStatusSchema),
    statusMessage: schema.maybe(
      schema.string({ meta: { description: 'Error context; set when transitioning to failed.' } })
    ),
    deploymentId: schema.maybe(
      schema.string({
        meta: {
          description:
            'CFN stack ARN (or equivalent); provided by the client after manual deployment.',
        },
      })
    ),
    deploymentName: schema.maybe(schema.string()),
    vars: schema.maybe(RequestVarsSchema),
    serviceVars: schema.maybe(RequestServiceVarsSchema),
    secrets: schema.maybe(RequestSecretsSchema),
    attemptCount: schema.maybe(
      schema.number({ min: 1, meta: { description: 'Incremented by callers performing a retry.' } })
    ),
    packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  }),
};

export const UpdateCloudOnboardingDeploymentResponseSchema = SingleItemResponseSchema;

export const DeleteCloudOnboardingDeploymentRequestSchema = { params: DeploymentIdParamSchema };

export const DeleteCloudOnboardingDeploymentResponseSchema = schema.object({
  id: schema.string(),
});
