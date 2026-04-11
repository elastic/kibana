/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Re-export shared osquery Scout fixtures and test data.
// The scout_osquery directory uses a custom config set (config_sets/osquery/)
// while sharing the same API service and test data as the main scout tests.
export { apiTest, testData } from '../../../scout/api/fixtures';
