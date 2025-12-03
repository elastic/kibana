/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './mocks';

// NOTE: Per RTL migration guidelines (Pattern 27), import from specific files, not this index.
// This file is kept for backward compatibility during migration.
// New tests should import directly:
//   import { setupEnvironment, WithAppDependencies } from './setup_environment';
//   import { indexSettings, indexMappings } from './fixtures';

// Re-export testbed utilities needed for backward compatibility
export type { TestBed } from '@kbn/test-jest-helpers';
export { getRandomString, findTestSubject } from '@kbn/test-jest-helpers';

export {
  setupEnvironment,
  WithAppDependencies,
  services,
  kibanaVersion,
} from './setup_environment';

export type { TestSubjects } from './test_subjects';

export * from './fixtures';
