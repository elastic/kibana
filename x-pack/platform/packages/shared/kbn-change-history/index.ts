/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './src/types';
export * from './src/client';
export { ILM_POLICY_NAME } from './src/constants';
/**
 * @internal exported for test use only — do NOT use in production code,
 * this could cause the index to be created before the feature is ready for GA
 */
export { FLAGS } from './src/constants';
