/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
=======
import { schema } from '@kbn/config-schema';
>>>>>>> 9.4
import { lensApiConfigSchemaNoESQL } from '@kbn/lens-embeddable-utils';

import { lensResponseItemSchema } from './common';

<<<<<<< HEAD
=======
export const lensCreateRequestQuerySchema = schema.object(
  {
    ...pickFromObjectSchema(lensCMCreateOptionsSchema.getPropSchemas(), ['overwrite']),
  },
  { unknowns: 'forbid' }
);

>>>>>>> 9.4
export const lensCreateRequestBodySchema = lensApiConfigSchemaNoESQL;

export const lensCreateResponseBodySchema = lensResponseItemSchema;
