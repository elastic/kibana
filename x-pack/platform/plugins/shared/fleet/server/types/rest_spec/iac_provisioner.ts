/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import { CLOUD_CONNECTOR_RENDER_FLOW } from '../../../common/telemetry/iac_provisioner_events';

/**
 * One package plus the policy templates the user enabled, each listing only the input
 * types the user enabled under it. Shared with the connector verify route, which sends
 * the same shape for the integration being added.
 */
export const RenderIacTemplateIntegrationSchema = schema.object({
  name: schema.string({
    minLength: 1,
    maxLength: 255,
    meta: { description: 'EPR package name.' },
  }),
  policyTemplates: schema.arrayOf(
    schema.object({
      name: schema.string({
        minLength: 1,
        maxLength: 255,
        meta: { description: 'Policy template name, as declared in the package manifest.' },
      }),
      enabledInputs: schema.arrayOf(schema.string({ minLength: 1, maxLength: 255 }), {
        minSize: 1,
        // Bounds input to avoid unbounded validation work; a policy template exposes
        // only a handful of inputs, so this is a generous ceiling.
        maxSize: 100,
        meta: {
          description: 'Input types the user enabled within this policy template.',
        },
      }),
    }),
    {
      minSize: 1,
      // Bounds input to avoid unbounded validation work; a package exposes
      // only a handful of policy templates, so this is a generous ceiling.
      maxSize: 100,
      meta: {
        description: 'Policy templates the user enabled, with the inputs enabled under each.',
      },
    }
  ),
});

export const RenderIacTemplateRequestSchema = {
  body: schema.object({
    provider: schema.oneOf([schema.literal(AWS_CLOUD_PROVIDER)], {
      meta: { description: 'The cloud provider the template targets. Only AWS is supported.' },
    }),
    flow: schema.oneOf([schema.literal(CLOUD_CONNECTOR_RENDER_FLOW)], {
      meta: { description: 'The Kibana flow requesting the render; reported in telemetry.' },
    }),
    integrations: schema.arrayOf(RenderIacTemplateIntegrationSchema, {
      minSize: 1,
      // Each entry costs a registry fetch; known flows send a single
      // integration, so this cap only exists to bound abuse.
      maxSize: 10,
      meta: { description: 'Integrations to render the template for.' },
    }),
  }),
};

// The route returns the provider's body verbatim, so both this object and the nested
// blueprint ignore unknown keys: a field IaCP adds must not fail response validation.
export const RenderIacTemplateResponseSchema = schema.object(
  {
    artifactUrl: schema.string({
      meta: {
        description:
          'Pre-signed URL of the rendered template. Embeds signing credentials — never log or cache.',
      },
    }),
    expiresAt: schema.string({
      meta: { description: 'ISO 8601 UTC timestamp when the pre-signed URL expires.' },
    }),
    // templateSha, render and blueprint are required by the provider's spec, but stay
    // optional here so a provider predating the contract fails open instead of
    // failing response validation. https://github.com/elastic/ingest-dev/issues/9415
    templateSha: schema.maybe(
      schema.string({
        meta: {
          description: 'Digest of the rendered template; stored on the cloud connector.',
        },
      })
    ),
    render: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'Whether the user must apply the rendered template; false when the stored digest still matches.',
        },
      })
    ),
    blueprint: schema.maybe(
      schema.object(
        {
          id: schema.string({ meta: { description: 'IaCP blueprint id.' } }),
          version: schema.string({ meta: { description: 'IaCP blueprint version.' } }),
        },
        {
          unknowns: 'ignore',
          meta: { description: 'The IaCP blueprint the template was rendered from.' },
        }
      )
    ),
  },
  { unknowns: 'ignore' }
);
