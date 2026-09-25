/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// --- Shared primitives ---

const EcfFamilySchema = schema.oneOf(
  [schema.literal('unified'), schema.literal('otel'), schema.literal('crowdstrike')],
  { meta: { description: 'ECF template family.' } }
);

const EcfStackSchema = schema.object({
  family: EcfFamilySchema,
  stackName: schema.string({
    minLength: 1,
    maxLength: 128,
    meta: { description: 'CloudFormation stack name (128-char AWS limit).' },
  }),
  templateVersion: schema.string({
    minLength: 1,
    maxLength: 32,
    meta: { description: 'ECF semantic version resolved at launch time, e.g. "1.10.0".' },
  }),
});

const CloudOnboardingDeploymentProviderSchema = schema.oneOf(
  [schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')],
  { meta: { description: 'Cloud provider.' } }
);

const CloudOnboardingDeploymentMechanismSchema = schema.oneOf(
  [schema.literal('managed_integration'), schema.literal('ecf'), schema.literal('agent_based')],
  {
    meta: {
      description: 'Delivery mechanism: managed_integration, ecf, or agent_based.',
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

const DataFormatSchema = schema.oneOf([schema.literal('ecs'), schema.literal('otel')], {
  meta: { description: 'Data format: ecs or otel.' },
});

const ServiceVarsEntrySchema = schema.recordOf(schema.string({ maxLength: 256 }), schema.any());

const RequestServiceVarsSchema = schema.recordOf(
  schema.string({ minLength: 1, maxLength: 256 }),
  ServiceVarsEntrySchema,
  { meta: { description: 'Per-service config keyed by instance ID.' } }
);

const OnboardingDeploymentIdParamSchema = schema.object({
  id: schema.string({
    maxLength: 255,
    meta: { description: 'The saved object ID of the cloud onboarding deployment.' },
  }),
});

// --- Item schema (response only — secrets intentionally excluded) ---

const CloudOnboardingDeploymentItemSchema = schema.object({
  id: schema.string(),
  provider: CloudOnboardingDeploymentProviderSchema,
  connectorId: schema.maybe(
    schema.string({
      meta: {
        description:
          'ID of the fleet-cloud-connector this deployment belongs to. Absent for static-keys deployments.',
      },
    })
  ),
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
          'Per-service config keyed by instance ID. Each value is the ServiceVars object from the Service Settings step.',
      },
    })
  ),
  globalRegion: schema.maybe(
    schema.string({
      meta: {
        description: 'Global AWS region from the Service Settings step.',
      },
    })
  ),
  dataFormat: schema.maybe(DataFormatSchema),
  authMethod: schema.maybe(
    schema.oneOf(
      [
        schema.literal('identity_federation'),
        schema.literal('static_keys'),
        schema.literal('temporary_keys'),
        schema.literal('shared_credentials'),
        schema.literal('assume_role'),
      ],
      {
        meta: {
          description:
            'Authentication method. Allowed values depend on the delivery mechanism:\n\n- managed_integration: identity_federation | static_keys\n- agent_based: static_keys (direct_access_keys) | temporary_keys | shared_credentials | assume_role',
        },
      }
    )
  ),
  agentPolicyIds: schema.maybe(
    schema.arrayOf(schema.string(), {
      maxSize: 1000,
      meta: {
        description:
          'Agent policy IDs for agent_based deployments. Single-element for new-policy deploys; multiple for existing-policy deploys targeting several policies.',
      },
    })
  ),
  packagePolicyIds: schema.maybe(
    schema.arrayOf(schema.string(), {
      maxSize: 1000,
      meta: {
        description:
          'Package policy IDs created for this deployment (managed_integration and agent_based).',
      },
    })
  ),
  policyIdsByInstance: schema.maybe(
    schema.recordOf(schema.string({ maxLength: 255 }), schema.string({ maxLength: 255 }), {
      validate: (v) => {
        if (Object.keys(v).length > 1000) return 'policyIdsByInstance must not exceed 1000 entries';
      },
      meta: {
        description:
          'instanceId → policyId mapping persisted after deploy. Hydrated into the wizard on resume to enable cleanup of stale policies when services are removed.',
      },
    })
  ),
  apiKeyId: schema.maybe(
    schema.string({
      meta: {
        description:
          'Elasticsearch API key ID for push mechanisms (ecf). Set by the backend; used for key rotation/revocation.',
      },
    })
  ),
  ecfStacks: schema.maybe(
    schema.arrayOf(EcfStackSchema, {
      maxSize: 10,
      meta: {
        description:
          'ECF CloudFormation stacks launched as part of this deployment. Written by the wizard after the user clicks Launch.',
      },
    })
  ),
});

const SingleItemResponseSchema = schema.object({ item: CloudOnboardingDeploymentItemSchema });

// --- Public schemas ---

export const CreateCloudOnboardingDeploymentRequestSchema = {
  body: schema.object({
    provider: CloudOnboardingDeploymentProviderSchema,
    connectorId: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 255,
        meta: {
          description:
            'ID of the fleet-cloud-connector to associate with this deployment. Omit for static-keys deployments.',
        },
      })
    ),
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
    globalRegion: schema.maybe(
      schema.string({
        maxLength: 64,
        meta: { description: 'Global AWS region from the Service Settings step.' },
      })
    ),
    dataFormat: schema.maybe(DataFormatSchema),
    authMethod: schema.maybe(
      schema.oneOf(
        [
          schema.literal('identity_federation'),
          schema.literal('static_keys'),
          schema.literal('temporary_keys'),
          schema.literal('shared_credentials'),
          schema.literal('assume_role'),
        ],
        {
          meta: {
            description:
              'Authentication method. Allowed values depend on the delivery mechanism:\n\n- managed_integration: identity_federation | static_keys\n- agent_based: static_keys (direct_access_keys) | temporary_keys | shared_credentials | assume_role',
          },
        }
      )
    ),
    agentPolicyIds: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: 255 }), {
        maxSize: 1000,
        meta: {
          description:
            'Agent policy IDs for agent_based existing-policy deploys. Provided on create so that a mid-deploy tab-close leaves a record that hydrates back into existing mode.',
        },
      })
    ),
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
      maxLength: 255,
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
      schema.string({
        maxLength: 1000,
        meta: { description: 'Error context; set when transitioning to failed.' },
      })
    ),
    deploymentId: schema.maybe(
      schema.string({
        maxLength: 2048,
        meta: {
          description:
            'CFN stack ARN (or equivalent); provided by the client after manual deployment.',
        },
      })
    ),
    deploymentName: schema.maybe(schema.string({ maxLength: 255 })),
    services: schema.maybe(
      schema.arrayOf(schema.string({ minLength: 1, maxLength: 255 }), {
        minSize: 1,
        maxSize: 1000,
        meta: { description: 'Updated service list. Replaces the stored services array.' },
      })
    ),
    serviceVars: schema.maybe(RequestServiceVarsSchema),
    services: schema.maybe(
      schema.arrayOf(schema.string({ minLength: 1, maxLength: 256 }), {
        minSize: 1,
        maxSize: 1000,
        meta: {
          description:
            'Current service set for this deployment. Refreshed on each successful deploy so resume after an incremental service addition restores all deployed services.',
        },
      })
    ),
    attemptCount: schema.maybe(
      schema.number({ min: 1, meta: { description: 'Incremented by callers performing a retry.' } })
    ),
    connectorId: schema.maybe(schema.nullable(schema.string({ maxLength: 255 }))),
    authMethod: schema.maybe(
      schema.nullable(
        schema.oneOf(
          [
            schema.literal('identity_federation'),
            schema.literal('static_keys'),
            schema.literal('temporary_keys'),
            schema.literal('shared_credentials'),
            schema.literal('assume_role'),
          ],
          {
            meta: {
              description:
                'Authentication method. Refreshed on each successful deploy so a credential-method change between deploys is reflected on resume.',
            },
          }
        )
      )
    ),
    agentPolicyIds: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: 255 }), {
        maxSize: 1000,
        meta: {
          description:
            'Agent policy IDs for agent_based deployments. Single-element for new-policy deploys; multiple for existing-policy deploys targeting several policies.',
        },
      })
    ),
    packagePolicyIds: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: 255 }), {
        maxSize: 1000,
        meta: {
          description:
            'Package policy IDs created for this deployment (managed_integration and agent_based).',
        },
      })
    ),
    policyIdsByInstance: schema.maybe(
      schema.recordOf(schema.string({ maxLength: 255 }), schema.string({ maxLength: 255 }), {
        validate: (v) => {
          if (Object.keys(v).length > 1000)
            return 'policyIdsByInstance must not exceed 1000 entries';
        },
      })
    ),
    apiKeyId: schema.maybe(schema.string({ maxLength: 255 })),
    mechanisms: schema.maybe(
      schema.arrayOf(CloudOnboardingDeploymentMechanismSchema, {
        maxSize: 10,
        meta: {
          description:
            'Delivery mechanisms active in this deployment. Replaces the stored mechanisms array.',
        },
      })
    ),
    ecfStacks: schema.maybe(
      schema.arrayOf(EcfStackSchema, {
        maxSize: 10,
        meta: { description: 'ECF CloudFormation stacks to record for this deployment.' },
      })
    ),
  }),
};

export const UpdateCloudOnboardingDeploymentResponseSchema = SingleItemResponseSchema;

export const DeleteCloudOnboardingDeploymentRequestSchema = {
  params: OnboardingDeploymentIdParamSchema,
};

export const DeleteCloudOnboardingDeploymentResponseSchema = schema.object({
  id: schema.string(),
});
