/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security';
import { test } from '../fixtures';

// NOTE: This spec is skipped in the original Cypress tests due to known flakiness.
// It has been migrated with the same skip status. Enable when the underlying issues are resolved.
test.describe.skip('ALL - Saved queries', { tag: ['@ess', '@svlSecurity'] }, () => {
  test('test case name', async ({ page }) => {
    // TODO: Implement when test is unskipped
  });
});
