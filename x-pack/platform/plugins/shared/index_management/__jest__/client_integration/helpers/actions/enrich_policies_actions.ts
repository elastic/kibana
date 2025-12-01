/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

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
    const table = screen.getByTestId('enrichPoliciesTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
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
    const table = screen.getByTestId('enrichPoliciesTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
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
    const table = screen.getByTestId('enrichPoliciesTable');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header
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
  const table = screen.getByTestId('enrichPoliciesTable');
  const rows = within(table).getAllByRole('row');
  // Subtract 1 for header row
  return rows.length - 1;
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
  const clickNextButton = async () => {
    fireEvent.click(screen.getByTestId('nextButton'));
  };

  const clickBackButton = async () => {
    fireEvent.click(screen.getByTestId('backButton'));
  };

  const clickRequestTab = async () => {
    fireEvent.click(screen.getByTestId('requestTab'));
  };

  const clickCreatePolicy = async () => {
    fireEvent.click(screen.getByTestId('createButton'));
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
    const nameInput = screen.getByTestId('policyNameField').querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'test_policy' } });
      fireEvent.blur(nameInput);
    }

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
      await indicesComboBox.selectOptionAsync(indexName);
    }

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    // Wait for form state to update - the form uses RxJS observables
    // The onChange handler is async, and field.setValue triggers RxJS subject updates
    // We need to wait for pills to appear AND for form validation to complete
    await waitFor(() => {
      const selected = indicesComboBox.selectedOptions;
      expect(selected).toContain(indexNames[0]);
    });

    // Additional wait to ensure RxJS observable chain completes and form validates
    // The form subscribes to field changes via observables, which might not be synchronous
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await clickNextButton();
  };

  const completeFieldsSelectionStep = async () => {
    // Match field using harness
    await screen.findByTestId('matchField');
    const matchFieldComboBox = new EuiComboBoxTestHarness('matchField');
    matchFieldComboBox.selectOption('name');

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    // Enrich fields using harness
    await screen.findByTestId('enrichFields');
    const enrichFieldsComboBox = new EuiComboBoxTestHarness('enrichFields');
    enrichFieldsComboBox.selectOption('email');

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await clickNextButton();
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
