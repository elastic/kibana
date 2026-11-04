/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  MATERIALIZE_API_PATH,
  MATERIALIZE_API_VERSION,
  MATERIALIZE_FEATURE_FLAG,
} from './constants';
export { isMaterializeByReference } from './materialize_types';
export type {
  MaterializeByReference,
  MaterializeByValue,
  MaterializeContext,
  MaterializeInput,
} from './materialize_types';
