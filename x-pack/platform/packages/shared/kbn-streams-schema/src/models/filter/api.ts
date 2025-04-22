/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import {
  StreamGetResponseBase,
  streamGetResponseSchemaBase,
  StreamUpsertRequestBase,
  streamUpsertRequestSchemaBase,
} from '../base/api';
import {
  FilterBase,
  filterBaseSchema,
  FilterStreamDefinition,
  FilterStreamDefinitionBase,
  filterStreamDefinitionBaseSchema,
  filterStreamDefinitionSchema,
} from './base';

/**
 * Filter get response
 */
interface FilterStreamGetResponse extends StreamGetResponseBase {
  stream: FilterStreamDefinition;
}

const filterStreamGetResponseSchema: z.Schema<FilterStreamGetResponse> = z.intersection(
  streamGetResponseSchemaBase,
  z.object({
    stream: filterStreamDefinitionSchema,
  })
);

/**
 * Filter object get response
 */

interface FilterObjectGetResponse {
  filter: FilterBase;
}

type FilterObjectUpsertRequest = FilterObjectGetResponse;

const filterObjectUpsertRequestSchema = z.object({
  filter: filterBaseSchema,
});

/**
 * Filter upsert request
 */
interface FilterStreamUpsertRequest extends StreamUpsertRequestBase {
  stream: FilterStreamDefinitionBase;
}

const filterStreamUpsertRequestSchema: z.Schema<FilterStreamUpsertRequest> = z.intersection(
  streamUpsertRequestSchemaBase,
  z.object({
    stream: filterStreamDefinitionBaseSchema,
  })
);

export {
  type FilterStreamGetResponse,
  type FilterObjectGetResponse,
  type FilterStreamUpsertRequest,
  type FilterObjectUpsertRequest,
  filterStreamGetResponseSchema,
  filterStreamUpsertRequestSchema,
  filterObjectUpsertRequestSchema,
};
