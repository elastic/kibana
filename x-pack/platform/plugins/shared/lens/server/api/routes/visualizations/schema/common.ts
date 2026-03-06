/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils';

import { lensCommonSavedObjectSchemaV2 } from '../../../../content_management';

const savedObjectProps = lensCommonSavedObjectSchemaV2.getPropSchemas();

/**
 * The Lens item meta returned from the server
 */
export const lensItemMetaSchema = schema.object(
  {
    type: savedObjectProps.type,
    created_at: savedObjectProps.createdAt,
    updated_at: savedObjectProps.updatedAt,
    created_by: savedObjectProps.createdBy,
    updated_by: savedObjectProps.updatedBy,
    origin_id: savedObjectProps.originId,
    managed: savedObjectProps.managed,
  },
  { unknowns: 'forbid' }
);

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = schema.object(
  {
    id: savedObjectProps.id,
    data: lensApiStateSchema,
    meta: lensItemMetaSchema,
  },
  { unknowns: 'forbid' }
);
