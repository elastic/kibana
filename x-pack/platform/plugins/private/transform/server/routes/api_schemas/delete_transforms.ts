/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { DeleteDataViewApiResponseSchema } from '@kbn/ml-data-view-utils/types/api_delete_response_schema';

import type { ResponseStatus } from './common';
import { transformStateSchema } from './common';

export const deleteTransformsRequestSchema = schema.object({
  /**
   * Delete Transform & Destination Index
   */
  transformsInfo: schema.arrayOf(
    schema.object({
      id: schema.string(),
      state: transformStateSchema,
    })
  ),
  deleteDestIndex: schema.maybe(schema.boolean()),
  deleteDestDataView: schema.maybe(schema.boolean()),
  forceDelete: schema.maybe(schema.boolean()),
});

export type DeleteTransformsRequestSchema = TypeOf<typeof deleteTransformsRequestSchema>;

export interface DeleteTransformStatus {
  transformDeleted: ResponseStatus;
  destIndexDeleted?: ResponseStatus;
  destDataViewDeleted?: DeleteDataViewApiResponseSchema;
  destinationIndex?: string | undefined;
}

export interface DeleteTransformsResponseSchema {
  [key: string]: DeleteTransformStatus;
}
