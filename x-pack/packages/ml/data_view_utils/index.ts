/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createDataViewFn } from './actions/create';
export { deleteDataViewFn } from './actions/delete';
export {
  dataViewCreateQuerySchema,
  type DataViewCreateQuerySchema,
} from './schemas/api_create_query_schema';
