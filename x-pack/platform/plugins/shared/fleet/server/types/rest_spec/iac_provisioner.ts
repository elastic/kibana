/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../common/types/rest_spec/iac_provisioner';
import { CLOUD_CONNECTOR_RENDER_FLOW } from '../../../common/telemetry/iac_provisioner_events';

const IacProvisionerFlowSchema = schema.oneOf([schema.literal(CLOUD_CONNECTOR_RENDER_FLOW)], {
  meta: {
    description: 'The Kibana flow requesting the render; reported in telemetry.',
  },
});

const IacPolicyTemplateSelectionSchema = schema.object({
  name: schema.string({
    minLength: 1,
    maxLength: 255,
    meta: { description: 'Policy template name as declared in the package manifest.' },
  }),
  enabledInputs: schema.arrayOf(schema.string({ minLength: 1, maxLength: 255 }), {
    minSize: 1,
    maxSize: 100,
    meta: { description: 'Input types the user enabled within this policy template.' },
  }),
});

/**
 * Upper bound on integrations per render. Each entry costs a registry fetch; known flows
 * send a single integration, so this cap only exists to bound abuse. The connector verify
 * route shares the limit because the merged set it returns is re-rendered as-is.
 */
export const MAX_IAC_RENDER_INTEGRATIONS = 10;

/**
 * One package plus the policy templates the user enabled, each listing only the input
 * types the user enabled under it. Shared with the connector verify route, which sends
 * the same shape for the integrations being added.
 */
export const RenderIacTemplateIntegrationSchema = schema.object({
  name: schema.string({
    minLength: 1,
    maxLength: 255,
    meta: { description: 'EPR package name.' },
  }),
  policyTemplates: schema.arrayOf(IacPolicyTemplateSelectionSchema, {
    minSize: 1,
    maxSize: 100,
    meta: {
      description: 'Policy templates whose enabled inputs to include.',
    },
  }),
});

const IacIntegrationsSchema = schema.arrayOf(RenderIacTemplateIntegrationSchema, {
  minSize: 1,
  maxSize: MAX_IAC_RENDER_INTEGRATIONS,
  meta: { description: 'Integrations selected by the user.' },
});

export const RenderIacTemplateRequestSchema = {
  body: schema.object({
    provider: schema.oneOf([schema.literal(AWS_CLOUD_PROVIDER)], {
      meta: { description: 'The cloud provider the template targets. Only AWS is supported.' },
    }),
    workflow: schema.oneOf([schema.literal(IAC_FEDERATED_IDENTITY_WORKFLOW)], {
      meta: {
        description:
          'Identity mechanism. Kibana name for the connector type; IaCP looks up the matching blueprint lineage.',
      },
    }),
    flow: IacProvisionerFlowSchema,
    integrations: IacIntegrationsSchema,
    templateSha: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 255,
        meta: {
          description:
            'Stored template digest from this connector. Omit on first render and after a static-template fallback.',
        },
      })
    ),
  }),
};

export const RenderIacTemplateResponseSchema = schema.object({
  artifactUrl: schema.maybe(
    schema.string({
      meta: {
        description:
          'Pre-signed URL of the rendered template. Present only when render is true. Embeds signing credentials — never log or cache.',
      },
    })
  ),
  expiresAt: schema.maybe(
    schema.string({
      meta: {
        description:
          'ISO 8601 UTC timestamp when the pre-signed URL expires. Present with artifactUrl.',
      },
    })
  ),
  templateSha: schema.string({
    meta: {
      description:
        'Digest of the canonical CloudFormation template. Persist on the connector at confirmation.',
    },
  }),
  render: schema.boolean({
    meta: {
      description:
        'True when the user must apply the template. False when the stored templateSha still matches.',
    },
  }),
  blueprint: schema.object({
    id: schema.string({
      meta: { description: 'Blueprint identifier that was rendered.' },
    }),
    version: schema.string({
      meta: { description: 'Blueprint version that was rendered.' },
    }),
  }),
});
