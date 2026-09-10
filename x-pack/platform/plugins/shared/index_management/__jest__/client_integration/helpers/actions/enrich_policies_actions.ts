/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiComboBoxTestHarness, EuiTableTestHarness } from '@kbn/test-eui-helpers';

/**
 * Actions for interacting with the enrich policies tab.
 */
export const createEnrichPoliciesActions = () => {
  const goToEnrichPoliciesTab = () => {
    fireEvent.click(screen.getByTestId('enrich_policiesTab'));
  };

  const clickReloadPoliciesButton = () => {
    fireEvent.click(screen.getByTestId('reloadPoliciesButton'));
  };

  const clickDeletePolicyAt = async (index: number) => {
    const rows = new EuiTableTestHarness('enrichPoliciesTable').getRows();
    const dataRow = rows[index] ?? null;
    const deleteButton = within(dataRow).getByTestId('deletePolicyButton');
    fireEvent.click(deleteButton);
    await screen.findByTestId('deletePolicyModal');
  };

  const clickConfirmDeletePolicyButton = async () => {
    const modal = screen.getByTestId('deletePolicyModal');
    const confirmButton = within(modal).getByTestId('confirmModalConfirmButton');
    fireEvent.click(confirmButton);
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByTestId('deletePolicyModal')).not.toBeInTheDocument();
    });
  };

  const clickExecutePolicyAt = async (index: number) => {
    const rows = new EuiTableTestHarness('enrichPoliciesTable').getRows();
    const dataRow = rows[index] ?? null;
    const executeButton = within(dataRow).getByTestId('executePolicyButton');
    fireEvent.click(executeButton);
    await screen.findByTestId('executePolicyModal');
  };

  const clickConfirmExecutePolicyButton = async () => {
    const modal = screen.getByTestId('executePolicyModal');
    const confirmButton = within(modal).getByTestId('confirmModalConfirmButton');
    fireEvent.click(confirmButton);
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByTestId('executePolicyModal')).not.toBeInTheDocument();
    });
  };

  const clickEnrichPolicyAt = async (index: number) => {
    const rows = new EuiTableTestHarness('enrichPoliciesTable').getRows();
    const dataRow = rows[index] ?? null;
    const policyLink = within(dataRow).getByTestId('enrichPolicyDetailsLink');
    fireEvent.click(policyLink);
    await screen.findByTestId('policyDetailsFlyout');
  };

  return {
    goToEnrichPoliciesTab,
    clickReloadPoliciesButton,
    clickDeletePolicyAt,
    clickConfirmDeletePolicyButton,
    clickExecutePolicyAt,
    clickConfirmExecutePolicyButton,
    clickEnrichPolicyAt,
  };
};

/**
 * Helper to get the number of rows in the enrich policies table.
 */
export const getEnrichPoliciesTableRowCount = (): number => {
  return screen.getAllByTestId('enrichPolicyDetailsLink').length;
};

/**
 * Helper to check if an element exists.
 */
export const exists = (testId: string): boolean => {
  return screen.queryByTestId(testId) !== null;
};

/**
 * Actions for interacting with the create enrich policy form.
 */
export const createCreateEnrichPolicyActions = () => {
  const user = userEvent.setup({ pointerEventsCheck: 0, delay: null });

  const clickNextButton = async ({ waitForTestId }: { waitForTestId?: string } = {}) => {
    // Best-effort cleanup: close any open combobox popovers before navigation.
    // This avoids leaving EuiPopover mounted during step transitions, which can trigger act() warnings.
    if (exists('fieldSelectionForm')) {
      const matchFieldComboBox = new EuiComboBoxTestHarness('matchField');
      if (matchFieldComboBox.getElement()) {
        await matchFieldComboBox.close();
      }

      const enrichFieldsComboBox = new EuiComboBoxTestHarness('enrichFields');
      if (enrichFieldsComboBox.getElement()) {
        await enrichFieldsComboBox.close();
      }
    }
    await user.click(screen.getByTestId('nextButton'));

    // If the caller expects a step transition (e.g. async submit handlers),
    // wait for the next step boundary here to keep state updates within RTL's act().
    if (waitForTestId) {
      await screen.findByTestId(waitForTestId);
    }
  };

  const clickBackButton = async ({ waitForTestId }: { waitForTestId?: string } = {}) => {
    // Best-effort cleanup: if we're on the field selection step, make sure combo boxes
    // are fully closed before navigating away. Leaving an EuiPopover open here can
    // schedule late async updates and trigger act() warnings.
    if (exists('fieldSelectionForm')) {
      const matchFieldComboBox = new EuiComboBoxTestHarness('matchField');
      if (matchFieldComboBox.getElement()) {
        await matchFieldComboBox.close();
      }

      const enrichFieldsComboBox = new EuiComboBoxTestHarness('enrichFields');
      if (enrichFieldsComboBox.getElement()) {
        await enrichFieldsComboBox.close();
      }
    }
    await user.click(screen.getByTestId('backButton'));

    // Optional step boundary wait (mirrors clickNextButton's API) to keep navigation-driven
    // updates within RTL's act() and reduce flake on slow CI.
    if (waitForTestId) {
      await screen.findByTestId(waitForTestId);
    }
  };

  const clickRequestTab = async () => {
    await user.click(screen.getByTestId('requestTab'));
  };

  const clickCreatePolicy = async () => {
    await user.click(screen.getByTestId('createButton'));
  };

  const isOnConfigurationStep = (): boolean => {
    return exists('configurationForm');
  };

  const isOnFieldSelectionStep = (): boolean => {
    return exists('fieldSelectionForm');
  };

  const isOnCreateStep = (): boolean => {
    return exists('creationStep');
  };

  const completeConfigurationStep = async ({ indices }: { indices?: string } = {}) => {
    // Fill in policy name
    const nameRow = screen.getByTestId('policyNameField');
    const nameInput = within(nameRow).getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'test_policy' } });
    fireEvent.blur(nameInput);

    // Set policy type
    const typeSelect = screen.getByTestId('policyTypeField');
    fireEvent.change(typeSelect, { target: { value: 'match' } });
    fireEvent.blur(typeSelect);

    // Wait for the indices field to be present AND for initial options to load
    // The component calls onSearchChange('*') on mount in useEffect
    await screen.findByTestId('policySourceIndicesField');

    // Wait a bit for the initial fetch to complete (useEffect + async fetch)
    await waitFor(() => {
      // Check if loading has completed by checking if toggle button exists
      // (it only renders when component is ready)
      const toggleButton = screen.queryByTestId('comboBoxToggleListButton');
      if (!toggleButton) {
        throw new Error('Combobox not ready');
      }
    });

    const indicesComboBox = new EuiComboBoxTestHarness('policySourceIndicesField');

    // Handle comma-separated indices for multiple selection
    const indexNames = (indices ?? 'test-1').split(',').map((s) => s.trim());
    for (const indexName of indexNames) {
      await indicesComboBox.select(indexName);
    }

    // Close the combobox popover (portal) so it can't intercept later clicks/keystrokes.
    await indicesComboBox.close();

    // Wait for form state to update - the form uses RxJS observables
    // The onChange handler is async, and field.setValue triggers RxJS subject updates
    // We need to wait for pills to appear AND for form validation to complete
    await waitFor(() => {
      const selected = indicesComboBox.getSelected();
      expect(selected).toContain(indexNames[0]);
    });

    // Ensure form validation has settled before navigating away.
    // Separate boundary from listbox closure: form validity/enabled state can lag behind UI selection
    // (hook-form-lib + observable updates). Waiting for the button state prevents flake.
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());

    await clickNextButton({ waitForTestId: 'fieldSelectionForm' });
  };

  const completeFieldsSelectionStep = async () => {
    // Match field using harness
    await screen.findByTestId('matchField');
    const matchFieldComboBox = new EuiComboBoxTestHarness('matchField');
    // `matchField` uses EuiComboBox singleSelection { asPlainText: true }, so there are no pills.
    // Use the sync selection API and rely on downstream UI boundaries (Next enabled) for validation.
    await matchFieldComboBox.select('first_name');
    // Selecting a singleSelection option should auto-close; avoid "toggle-click" close() here.
    await matchFieldComboBox.waitForClosed();

    // Enrich fields using harness
    await screen.findByTestId('enrichFields');
    const enrichFieldsComboBox = new EuiComboBoxTestHarness('enrichFields');
    await enrichFieldsComboBox.select('age');
    await enrichFieldsComboBox.close();
    // 2) Then wait for validation to settle (Next enabled). This can update after the listbox is gone.
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());

    await clickNextButton({ waitForTestId: 'creationStep' });
  };

  const getErrorsMessages = (): string[] => {
    const errors = screen.queryAllByText((content, element) => {
      return (
        element?.classList.contains('euiFormErrorText') ||
        element?.getAttribute('class')?.includes('euiFormErrorText') ||
        false
      );
    });
    return errors.map((el) => el.textContent || '');
  };

  return {
    clickNextButton,
    clickBackButton,
    clickRequestTab,
    clickCreatePolicy,
    isOnConfigurationStep,
    isOnFieldSelectionStep,
    isOnCreateStep,
    completeConfigurationStep,
    completeFieldsSelectionStep,
    getErrorsMessages,
  };
};
