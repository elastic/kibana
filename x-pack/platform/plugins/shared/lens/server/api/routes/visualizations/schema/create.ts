/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils/config_builder';

import { lensResponseItemSchema } from './common';

// Inline schema so that the description renders in the generated OAS.
// The shared lensCMCreateOptionsSchema doesn't carry descriptions.
export const lensCreateRequestQuerySchema = schema.object(
  {
    overwrite: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'When `true`, replaces an existing visualization that has the same ID. Defaults to `false`.',
        },
      })
    ),
  },
  { unknowns: 'forbid' }
);

export const lensCreateRequestBodySchema = lensApiStateSchema;

export const lensCreateResponseBodySchema = lensResponseItemSchema;
