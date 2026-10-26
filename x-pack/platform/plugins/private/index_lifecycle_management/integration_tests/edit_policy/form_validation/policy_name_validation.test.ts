/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor, fireEvent } from '@testing-library/react';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';
import { setupEnvironment } from '../../helpers/setup_environment';
import { renderEditPolicy } from '../../helpers/render_edit_policy';
import { getGeneratedPolicies, getDefaultHotPhasePolicy, POLICY_NAME } from '../constants';

const setPolicyName = (name: string) => {
  const field = screen.getByTestId<HTMLInputElement>('policyNameField');
  fireEvent.change(field, { target: { value: name } });
  fireEvent.blur(field);
};

const expectErrorMessages = (expectedMessages: string[]) => {
  const errorTexts: string[] = [];
  const alertElements = screen.queryAllByRole('alert');

  alertElements.forEach((el) => {
    const texts = el.querySelectorAll('.euiFormErrorText');
    texts.forEach((text) => {
      const content = text.textContent?.trim();
      if (content) errorTexts.push(content);
    });
  });

  if (errorTexts.length === 0) {
    const errorElements = document.body.querySelectorAll('.euiFormErrorText');
    errorElements.forEach((el) => {
      const content = el.textContent?.trim();
      if (content) errorTexts.push(content);
    });
  }

  expect(errorTexts).toEqual(expectedMessages);
};

describe('<EditPolicy /> policy name validation', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('new policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        getDefaultHotPhasePolicy(),
        ...getGeneratedPolicies(),
      ]);

      renderEditPolicy(httpSetup, { isNewPolicy: true });
      await screen.findByTestId('savePolicyButton');
    });

    test(`doesn't allow empty policy name`, async () => {
      fireEvent.click(screen.getByTestId('savePolicyButton'));
      await waitFor(() =>
        expectErrorMessages([i18nTexts.editPolicy.errors.policyNameRequiredMessage])
      );
    });

    test(`doesn't allow policy name with space`, async () => {
      setPolicyName('my policy');
      await waitFor(() =>
        expectErrorMessages([i18nTexts.editPolicy.errors.policyNameContainsInvalidChars])
      );
    });

    test(`doesn't allow policy name that is already used`, async () => {
      setPolicyName('testy0');
      await waitFor(() =>
        expectErrorMessages([i18nTexts.editPolicy.errors.policyNameAlreadyUsedErrorMessage])
      );
    });

    test(`doesn't allow policy name with comma`, async () => {
      setPolicyName('my,policy');
      await waitFor(() =>
        expectErrorMessages([i18nTexts.editPolicy.errors.policyNameContainsInvalidChars])
      );
    });

    test(`doesn't allow policy name starting with underscore`, async () => {
      setPolicyName('_mypolicy');
      await waitFor(() =>
        expectErrorMessages([
          i18nTexts.editPolicy.errors.policyNameStartsWithUnderscoreErrorMessage,
        ])
      );
    });
  });

  describe('existing policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      httpRequestsMockHelpers.setLoadPolicies([
        getDefaultHotPhasePolicy(),
        ...getGeneratedPolicies(),
      ]);

      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test(`doesn't allow to save as new policy but using the same name`, async () => {
      // Toggle "save as new" to show the policy name field
      // The field will be pre-populated with the existing policy name (my_policy)
      fireEvent.click(screen.getByTestId('saveAsNewSwitch'));

      // Trigger validation by changing the value and changing it back
      // This ensures validation runs on the pre-populated value
      setPolicyName('temp');
      setPolicyName(POLICY_NAME);

      // When saving as new, the policy name must be different from the original
      await waitFor(() =>
        expectErrorMessages([i18nTexts.editPolicy.errors.policyNameMustBeDifferentErrorMessage])
      );
    });
  });
});
