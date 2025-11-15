/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';
import {
  setupEnvironment,
  renderEditPolicy,
  setPolicyName,
  savePolicy,
  toggleSwitch,
  expectErrorMessages,
} from '../../helpers';
import { getGeneratedPolicies, getDefaultHotPhasePolicy, POLICY_NAME } from '../constants';

describe('<EditPolicy /> policy name validation', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('new policy', () => {
    beforeEach(async () => {
      // HTTP Mock Hygiene (main-2co Pattern 8): Mock all endpoints before rendering
      httpRequestsMockHelpers.setDefaultResponses();
      // Include the policy being edited (my_policy) along with other policies for validation
      httpRequestsMockHelpers.setLoadPolicies([
        getDefaultHotPhasePolicy(),
        ...getGeneratedPolicies(),
      ]);

      // Pattern 1c: Component Rendering with Timers
      renderEditPolicy(httpSetup, { isNewPolicy: true });

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test(`doesn't allow empty policy name`, async () => {
      await savePolicy(httpSetup);
      expectErrorMessages([i18nTexts.editPolicy.errors.policyNameRequiredMessage]);
    });

    test(`doesn't allow policy name with space`, async () => {
      await setPolicyName('my policy');
      expectErrorMessages([i18nTexts.editPolicy.errors.policyNameContainsInvalidChars]);
    });

    test(`doesn't allow policy name that is already used`, async () => {
      await setPolicyName('testy0');
      expectErrorMessages([i18nTexts.editPolicy.errors.policyNameAlreadyUsedErrorMessage]);
    });

    test(`doesn't allow policy name with comma`, async () => {
      await setPolicyName('my,policy');
      expectErrorMessages([i18nTexts.editPolicy.errors.policyNameContainsInvalidChars]);
    });

    test(`doesn't allow policy name starting with underscore`, async () => {
      await setPolicyName('_mypolicy');
      expectErrorMessages([i18nTexts.editPolicy.errors.policyNameStartsWithUnderscoreErrorMessage]);
    });
  });

  describe('existing policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        getDefaultHotPhasePolicy(),
        ...getGeneratedPolicies(),
      ]);

      // Render existing policy (not new)
      renderEditPolicy(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test(`doesn't allow to save as new policy but using the same name`, async () => {
      // Toggle "save as new" to show the policy name field
      // The field will be pre-populated with the existing policy name (my_policy)
      await toggleSwitch('saveAsNewSwitch');

      // Trigger validation by changing the value and changing it back
      // This ensures validation runs on the pre-populated value
      await setPolicyName('temp');
      await setPolicyName(POLICY_NAME);

      // When saving as new, the policy name must be different from the original
      expectErrorMessages([i18nTexts.editPolicy.errors.policyNameMustBeDifferentErrorMessage]);
    });
  });
});
