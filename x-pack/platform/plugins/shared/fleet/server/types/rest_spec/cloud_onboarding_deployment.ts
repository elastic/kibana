/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

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

// secrets is intentionally excluded from all response schemas — never returned to clients.
const CloudOnboardingDeploymentItemSchema = schema.object({
  id: schema.string(),
  provider: schema.oneOf([schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')], {
    meta: { description: 'Cloud provider.' },
  }),
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
    schema.string({
      meta: { description: 'Opaque deployment name; for AWS, the CFN stack name.' },
    })
  ),
  services: schema.arrayOf(schema.string(), {
    maxSize: 1000,
    meta: { description: 'Service IDs covered by this deployment.' },
  }),
  status: CloudOnboardingDeploymentStatusSchema,
  statusMessage: schema.maybe(
    schema.string({
      meta: { description: 'Error context when status is failed.' },
    })
  ),
  attemptCount: schema.number({
    min: 1,
    meta: { description: 'Number of deployment attempts, including the current one.' },
  }),
  vars: schema.recordOf(schema.string(), schema.string(), {
    meta: { description: 'Deployment-level plaintext config (e.g. role_arn, api_key_id).' },
  }),
  serviceVars: schema.recordOf(
    schema.string(),
    schema.arrayOf(schema.recordOf(schema.string(), schema.any()), { maxSize: 100 }),
    {
      meta: {
        description:
          'Per-service config keyed by service ID. Each entry is an array of source configs (regions, S3 bucket ARN, etc.).',
      },
    }
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

export const CreateCloudOnboardingDeploymentRequestSchema = {
  body: schema.object({
    provider: schema.oneOf(
      [schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')],
      { meta: { description: 'Cloud provider.' } }
    ),
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
    vars: schema.maybe(
      schema.recordOf(schema.string({ minLength: 1 }), schema.string(), {
        meta: { description: 'Deployment-level plaintext config.' },
      })
    ),
    serviceVars: schema.maybe(
      schema.recordOf(
        schema.string({ minLength: 1 }),
        schema.arrayOf(schema.recordOf(schema.string(), schema.any()), { maxSize: 100 }),
        { meta: { description: 'Per-service source configs.' } }
      )
    ),
  }),
};

export const CreateCloudOnboardingDeploymentResponseSchema = schema.object({
  item: CloudOnboardingDeploymentItemSchema,
});

export const GetCloudOnboardingDeploymentRequestSchema = {
  params: schema.object({
    deploymentId: schema.string({
      meta: { description: 'The unique identifier of the cloud onboarding deployment.' },
    }),
  }),
};

export const GetCloudOnboardingDeploymentResponseSchema = schema.object({
  item: CloudOnboardingDeploymentItemSchema,
});

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
  params: schema.object({
    deploymentId: schema.string({
      meta: { description: 'The unique identifier of the deployment to update.' },
    }),
  }),
  body: schema.object({
    status: schema.maybe(CloudOnboardingDeploymentStatusSchema),
    statusMessage: schema.maybe(
      schema.string({
        meta: { description: 'Error context; set when transitioning to failed.' },
      })
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
    vars: schema.maybe(schema.recordOf(schema.string({ minLength: 1 }), schema.string())),
    serviceVars: schema.maybe(
      schema.recordOf(
        schema.string({ minLength: 1 }),
        schema.arrayOf(schema.recordOf(schema.string(), schema.any()), { maxSize: 100 })
      )
    ),
    attemptCount: schema.maybe(
      schema.number({
        min: 1,
        meta: { description: 'Incremented by callers performing a retry.' },
      })
    ),
    packagePolicyIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  }),
};

export const UpdateCloudOnboardingDeploymentResponseSchema = schema.object({
  item: CloudOnboardingDeploymentItemSchema,
});

export const DeleteCloudOnboardingDeploymentRequestSchema = {
  params: schema.object({
    deploymentId: schema.string({
      meta: { description: 'The unique identifier of the deployment to delete.' },
    }),
  }),
};

export const DeleteCloudOnboardingDeploymentResponseSchema = schema.object({
  id: schema.string(),
});
