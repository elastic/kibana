/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getAlertFieldsRequestSchema, getAlertFieldsResponseSchema } from './schemas/latest';

export {
  getAlertFieldsResponseSchema as getAlertFieldsResponseSchemaV1,
  getAlertFieldsRequestSchema as getAlertFieldsRequestSchemaV1,
} from './schemas/v1';

export type { GetAlertFieldsRequest, GetAlertFieldsResponse } from './schemas/latest';
export type {
  GetAlertFieldsRequest as GetAlertFieldsRequestV1,
  GetAlertFieldsResponse as GetAlertFieldsResponseV1,
} from './schemas/v1';
