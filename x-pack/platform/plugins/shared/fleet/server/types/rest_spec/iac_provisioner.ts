/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import {
  CLOUD_CONNECTOR_RENDER_FLOW,
  UNIFIED_ONBOARDING_RENDER_FLOW,
} from '../../../common/telemetry/iac_provisioner_events';

const IacProvisionerFlowSchema = schema.oneOf(
  [schema.literal(CLOUD_CONNECTOR_RENDER_FLOW), schema.literal(UNIFIED_ONBOARDING_RENDER_FLOW)],
  {
    meta: { description: 'The Kibana flow requesting the call; reported in telemetry.' },
  }
);

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

const IacIntegrationsSchema = schema.arrayOf(
  schema.object({
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
  }),
  {
    minSize: 1,
    // Each entry costs a registry fetch; known flows send a single
    // integration, so this cap only exists to bound abuse.
    maxSize: 10,
    meta: { description: 'Integrations selected by the user.' },
  }
);

export const RenderIacTemplateRequestSchema = {
  body: schema.object({
    provider: schema.oneOf([schema.literal(AWS_CLOUD_PROVIDER)], {
      meta: { description: 'The cloud provider the template targets. Only AWS is supported.' },
    }),
    blueprintId: schema.string({
      minLength: 1,
      maxLength: 255,
      meta: {
        description: 'Blueprint to render, taken from a deployable resolve result.',
      },
    }),
    flow: IacProvisionerFlowSchema,
    integrations: IacIntegrationsSchema,
    userParams: schema.maybe(
      schema.recordOf(
        schema.string({ minLength: 1, maxLength: 255 }),
        schema.string({ minLength: 1, maxLength: 1024 })
      )
    ),
  }),
};

export const RenderIacTemplateResponseSchema = schema.object({
  artifactUrl: schema.string({
    meta: {
      description:
        'Pre-signed URL of the rendered template. Embeds signing credentials — never log or cache.',
    },
  }),
  expiresAt: schema.string({
    meta: { description: 'ISO 8601 UTC timestamp when the pre-signed URL expires.' },
  }),
  blueprint: schema.object({
    id: schema.string({
      meta: { description: 'Blueprint identifier that was rendered.' },
    }),
    version: schema.string({
      meta: { description: 'Blueprint version that was resolved and rendered.' },
    }),
  }),
});

export const ResolveIacBlueprintsRequestSchema = {
  body: schema.object({
    provider: schema.oneOf([schema.literal(AWS_CLOUD_PROVIDER)], {
      meta: {
        description: 'The cloud provider the integrations run against. Only AWS is supported.',
      },
    }),
    flow: IacProvisionerFlowSchema,
    integrations: IacIntegrationsSchema,
  }),
};

const IacNotCoveredReasonSchema = schema.object({
  integration: schema.string({
    minLength: 1,
    maxLength: 255,
    meta: { description: 'EPR package name of the integration that is not covered.' },
  }),
  reason: schema.oneOf(
    [
      schema.literal('unknown_package'),
      schema.literal('unknown_policy_template'),
      schema.literal('no_patch_for_input'),
      schema.literal('below_support_floor'),
    ],
    { meta: { description: 'Machine-readable reason code.' } }
  ),
  policyTemplate: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 255,
      meta: { description: 'Policy template name, when the reason is template- or input-scoped.' },
    })
  ),
  input: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 255,
      meta: { description: 'Input name, when the reason is no_patch_for_input.' },
    })
  ),
  supportFloor: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 64,
      meta: { description: 'Minimum version required, when the reason is below_support_floor.' },
    })
  ),
  installedVersion: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 64,
      meta: { description: 'Installed package version, when the reason is below_support_floor.' },
    })
  ),
});

export const ResolveIacBlueprintsResponseSchema = schema.object({
  blueprints: schema.arrayOf(
    schema.object({
      id: schema.string({
        minLength: 1,
        maxLength: 255,
        meta: { description: 'Blueprint identifier.' },
      }),
      resolvedVersion: schema.nullable(
        schema.string({
          minLength: 1,
          maxLength: 64,
          meta: {
            description:
              'Blueprint version that satisfies the request, or null when not deployable.',
          },
        })
      ),
      deployable: schema.boolean({
        meta: { description: 'True when every requested integration is covered.' },
      }),
      notCovered: schema.arrayOf(IacNotCoveredReasonSchema, {
        maxSize: 100,
        meta: { description: 'Reasons why one or more integrations are not covered.' },
      }),
    }),
    {
      maxSize: 50,
      meta: { description: 'Coverage result for every known blueprint.' },
    }
  ),
});
