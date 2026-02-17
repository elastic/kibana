/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Re-export fixtures from the main scout_osquery test directory to avoid duplication.
// The tier tests use the same page objects, helpers, and test extension.
export { test } from '../../../scout_osquery/ui/fixtures';
export type { KbnClient } from '../../../scout_osquery/ui/fixtures';
