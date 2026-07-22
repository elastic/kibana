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
    schema.literal('agentless'),
    schema.literal('firehose'),
    schema.literal('cloud_forwarder'),
    schema.literal('agent_based'),
  ],
  {
    meta: {
      description: 'Delivery mechanism: agentless, firehose, cloud_forwarder, or agent_based.',
    },
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

const ServiceVarsEntrySchema = schema.arrayOf(schema.recordOf(schema.string(), schema.any()), {
  maxSize: 100,
});

const RequestServiceVarsSchema = schema.recordOf(
  schema.string({ minLength: 1 }),
  ServiceVarsEntrySchema,
  { meta: { description: 'Per-service source configs.' } }
);

const OnboardingDeploymentIdParamSchema = schema.object({
  id: schema.string({
    meta: { description: 'The saved object ID of the cloud onboarding deployment.' },
  }),
});

// --- Item schema (response only — secrets intentionally excluded) ---

const CloudOnboardingDeploymentItemSchema = schema.object({
  id: schema.string(),
  provider: CloudOnboardingDeploymentProviderSchema,
  connectorId: schema.string({
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
  attemptCount: schema.number({
    min: 1,
    meta: { description: 'Number of deployment attempts, including the current one.' },
  }),
  serviceVars: schema.maybe(
    schema.recordOf(schema.string(), ServiceVarsEntrySchema, {
      meta: {
        description:
          'Per-service config keyed by service ID. Each entry is an array of source configs (regions, S3 bucket ARN, etc.).',
      },
    })
  ),
  agentPolicyId: schema.maybe(
    schema.string({
      meta: {
        description:
          'Agent policy ID created for agent-based deployments. Present only when agent_based is in mechanisms.',
      },
    })
  ),
  packagePolicyIds: schema.maybe(
    schema.arrayOf(schema.string(), {
      maxSize: 100,
      meta: {
        description:
          'Package policy IDs created for agentless services. Present only when agentless is in mechanisms.',
      },
    })
  ),
  apiKeyId: schema.maybe(
    schema.string({
      meta: {
        description:
          'Elasticsearch API key ID for push mechanisms (firehose, cloud_forwarder). Set by the backend; used for key rotation/revocation.',
      },
    })
  ),
});

const SingleItemResponseSchema = schema.object({ item: CloudOnboardingDeploymentItemSchema });

// --- Public schemas ---

export const CreateCloudOnboardingDeploymentRequestSchema = {
  body: schema.object({
    provider: CloudOnboardingDeploymentProviderSchema,
    connectorId: schema.string({
      minLength: 1,
      meta: { description: 'ID of the fleet-cloud-connector to associate with this deployment.' },
    }),
    mechanisms: schema.arrayOf(CloudOnboardingDeploymentMechanismSchema, {
      maxSize: 10,
      meta: { description: 'Delivery mechanisms active in this deployment.' },
    }),
    services: schema.arrayOf(schema.string({ minLength: 1 }), {
      minSize: 1,
      maxSize: 1000,
      meta: { description: 'Service IDs to be covered by this deployment.' },
    }),
    serviceVars: schema.maybe(RequestServiceVarsSchema),
  }),
};

export const CreateCloudOnboardingDeploymentResponseSchema = SingleItemResponseSchema;

export const GetCloudOnboardingDeploymentRequestSchema = {
  params: OnboardingDeploymentIdParamSchema,
};

export const GetCloudOnboardingDeploymentResponseSchema = SingleItemResponseSchema;

export const GetCloudOnboardingDeploymentsByConnectorIdRequestSchema = {
  params: schema.object({
    connectorId: schema.string({
      minLength: 1,
      meta: { description: 'The fleet-cloud-connector ID to list deployments for.' },
    }),
  }),
};

export const GetCloudOnboardingDeploymentsByConnectorIdResponseSchema = schema.object({
  items: schema.arrayOf(CloudOnboardingDeploymentItemSchema, { maxSize: 100 }),
});

export const UpdateCloudOnboardingDeploymentRequestSchema = {
  params: OnboardingDeploymentIdParamSchema,
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
    serviceVars: schema.maybe(RequestServiceVarsSchema),
    attemptCount: schema.maybe(
      schema.number({ min: 1, meta: { description: 'Incremented by callers performing a retry.' } })
    ),
    agentPolicyId: schema.maybe(schema.string()),
    packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
    apiKeyId: schema.maybe(schema.string()),
  }),
};

export const UpdateCloudOnboardingDeploymentResponseSchema = SingleItemResponseSchema;

export const DeleteCloudOnboardingDeploymentRequestSchema = {
  params: OnboardingDeploymentIdParamSchema,
};

export const DeleteCloudOnboardingDeploymentResponseSchema = schema.object({
  id: schema.string(),
});
