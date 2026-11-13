/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout API coverage for the shared Wiki kernel lifecycle.
 *
 * Full stack exercise (register AI index → recall → record → corroborate → archive)
 * lands with Context Engine Scout configs once agentKnowledge is bootstrapped in CI.
 * Until then this file documents the contract and keeps the Scout package discoverable.
 *
 * Degradation expectations covered by unit tests in wiki_service.test.ts:
 * - Context Engine / memory disabled → recall returns empty markdown, record is skipped by callers
 * - Lint-blocking content is refused on record (never establishes bad exclusions)
 */
import { test } from '@kbn/scout';

test.describe('agentKnowledge wiki lifecycle', () => {
  test('shared wiki kernel is documented for Scout follow-up', async ({}) => {
    // Placeholder until CE Scout fixtures wire the managed wiki AI index.
  });
});
