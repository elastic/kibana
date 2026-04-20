/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchemaNoESQL } from '@kbn/lens-embeddable-utils';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

import { lensCommonSavedObjectSchemaV2 } from '../../../../content_management';

const savedObjectProps = lensCommonSavedObjectSchemaV2.getPropSchemas();

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = schema.object(
  {
    id: savedObjectProps.id,
    data: lensApiStateSchemaNoESQL,
    meta: asCodeMetaSchema,
  },
  { unknowns: 'forbid', meta: { id: 'lensResponseItem', title: 'Visualization Response' } }
);
