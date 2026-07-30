/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import { CLOUD_CONNECTOR_RENDER_FLOW } from '../../../common/telemetry/iac_provider_events';

export const RenderIacTemplateRequestSchema = {
  body: schema.object({
    provider: schema.oneOf([schema.literal(AWS_CLOUD_PROVIDER)], {
      meta: { description: 'The cloud provider the template targets. Only AWS is supported.' },
    }),
    flow: schema.oneOf([schema.literal(CLOUD_CONNECTOR_RENDER_FLOW)], {
      meta: { description: 'The Kibana flow requesting the render; reported in telemetry.' },
    }),
    integrations: schema.arrayOf(
      schema.object({
        name: schema.string({
          minLength: 1,
          maxLength: 255,
          meta: { description: 'EPR package name.' },
        }),
        policyTemplates: schema.arrayOf(schema.string({ minLength: 1, maxLength: 255 }), {
          minSize: 1,
          meta: {
            description:
              'Policy template names whose inputs to include. Multiple values merge same-package entries.',
          },
        }),
      }),
      {
        minSize: 1,
        // Each entry costs a registry fetch; policy groups are small (2-3
        // integrations), so this cap only exists to bound abuse.
        maxSize: 10,
        meta: { description: 'Integrations to render the template for.' },
      }
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
});
