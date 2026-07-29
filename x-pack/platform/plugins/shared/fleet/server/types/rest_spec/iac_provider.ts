/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const RenderIacTemplateRequestSchema = {
  body: schema.object({
    provider: schema.oneOf([schema.literal('aws')], {
      meta: { description: 'The cloud provider the template targets. Only AWS is supported.' },
    }),
    packageName: schema.string({
      minLength: 1,
      maxLength: 255,
      meta: { description: 'EPR package name of the integration being set up.' },
    }),
    policyTemplate: schema.string({
      minLength: 1,
      maxLength: 255,
      meta: { description: 'Policy template name within the package.' },
    }),
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
