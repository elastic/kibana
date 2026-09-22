/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { lensApiConfigSchemaNoESQL } from '@kbn/lens-embeddable-utils';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

import { lensCommonSavedObjectSchemaV2 } from '../../../../content_management/zod';

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = z
  .object({
    id: lensCommonSavedObjectSchemaV2.shape.id,
    data: lensApiConfigSchemaNoESQL,
    meta: asCodeMetaSchema,
  })
  .strict()
  .meta({ id: 'lensResponseItem', title: 'Visualization Response' });
