/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform');

export function XJsonMode() {}
export function setDependencyCache() {}
export const useRequest = () => ({
  isLoading: false,
  error: null,
  data: undefined,
});
export { mlInMemoryTableBasicFactory } from '../../../ml/public/application/components/ml_in_memory_table';
export const SORT_DIRECTION = { ASC: 'asc' };
