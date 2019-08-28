/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { createSpaces } from './create_spaces';
export {
  createTestHandler,
  TestConfig,
  TestOptions,
  TeardownFn,
  RequestRunner,
  RequestRunnerResult,
} from './create_test_handler';
