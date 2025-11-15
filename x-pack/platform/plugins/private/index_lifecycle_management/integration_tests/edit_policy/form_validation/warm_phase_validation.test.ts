/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { cleanup } from '@testing-library/react';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';
import { setupEnvironment } from '../../helpers';
import type { ValidationTestBed } from './validation.helpers';
import { setupValidationTestBed } from './validation.helpers';

describe('<EditPolicy /> warm phase validation', () => {
  let testBed: ValidationTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Pattern 6: Test Structure & Isolation (main-2co)
    // Reset environment for each test, but don't render yet
    jest.clearAllMocks();
    ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterEach(() => {
    // Pattern 6: Test Structure & Isolation (main-2co)
    // Cleanup to prevent test pollution
    cleanup(); // RTL cleanup to unmount all components
    jest.clearAllTimers(); // Clear any pending timers
  });

  // Helper to setup test with warm phase enabled
  const setupTest = async () => {
    httpRequestsMockHelpers.setDefaultResponses();
    httpRequestsMockHelpers.setLoadPolicies([]);

    // Pattern 1c: Component Rendering with Timers (main-2co)
    await act(async () => {
      testBed = setupValidationTestBed(httpSetup);
      await jest.runOnlyPendingTimersAsync();
    });

    // Advance timers multiple times to ensure all async operations complete
    // This is needed because the component may have nested async operations
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    const { actions } = testBed;
    await actions.setPolicyName('mypolicy');
    await actions.togglePhase('warm');
  };

  describe('replicas', () => {
    test(`doesn't allow -1 for replicas`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setReplicas('-1');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for replicas`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setReplicas('0');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([]);
    });
  });

  describe('shrink', () => {
    test(`doesn't allow 0 for shrink size`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setShrinkSize('0');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink size`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setShrinkSize('-1');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow 0 for shrink count`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setShrinkCount('0');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink count`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setShrinkCount('-1');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('forcemerge', () => {
    test(`doesn't allow 0 for forcemerge`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.toggleForceMerge();
      await actions.warm.setForcemergeSegmentsCount('0');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for forcemerge`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.toggleForceMerge();
      await actions.warm.setForcemergeSegmentsCount('-1');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setIndexPriority('-1');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for index priority`, async () => {
      await setupTest();
      const { actions } = testBed;
      await actions.warm.setIndexPriority('0');

      await actions.errors.waitForValidation();

      actions.errors.expectMessages([]);
    });
  });
});
