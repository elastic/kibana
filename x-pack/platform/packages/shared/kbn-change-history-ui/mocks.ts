/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createMockChangeHistoryAdapter,
  type CreateMockChangeHistoryAdapterOptions,
  type MockChangeHistoryAdapter,
} from './mocks/create_mock_adapter';
export {
  createMockChangeHistoryDetails,
  MOCK_CHANGE_HISTORY_OBJECT_ID,
} from './mocks/change_history_fixtures';
export {
  TEST_CHANGE_HISTORY_SCOPE,
  TEST_OBJECT_ID,
  TEST_OBJECT_ID_A,
  TEST_OBJECT_ID_B,
  TEST_OBJECT_TITLE,
  TEST_SNAPSHOT,
  TEST_SNAPSHOT_OLD,
  TEST_SNAPSHOT_OLDER,
} from './src/test_utils/change_history_test_fixtures';
export { TestProvider, getTestProvider } from './src/test_utils/test_providers';
export type { TestProviderProps } from './src/test_utils/test_providers';
export { createTestQueryClient } from './src/test_utils/create_query_client_wrapper';
export { createQueryClientWrapper } from './src/test_utils/create_query_client_wrapper';
export { createChangeHistoryHookWrapper } from './src/test_utils/create_change_history_hook_wrapper';
