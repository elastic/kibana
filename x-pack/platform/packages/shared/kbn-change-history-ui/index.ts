/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './src/types';
export { createChangeHistoryHttpAdapter } from './src/adapters';
export type { ChangeHistoryHttpAdapterConfig } from './src/adapters';
export { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from './src/types';
