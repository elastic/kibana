/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

interface CompleteStepOneOptions {
  indexPatterns?: string[];
  priority?: number;
  allowAutoCreate?: string;
  version?: number;
  lifecycle?: { enabled: boolean; value: number; unit: string };
  indexMode?: string;
  name?: string;
}

/**
 * Actions for interacting with the template create wizard.
 */
export const createTemplateCreateActions = () => {
  const flushPending = async (times: number = 1) => {
    for (let i = 0; i < times; i++) {
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    }
  };

  /**
   * Advance fake timers until a condition becomes true (bounded).
   *
   * This is preferable to hardcoding multiple `runOnlyPendingTimersAsync()` calls when we know
   * the observable UI state we're waiting for (e.g. a step to mount, a field to appear).
   */
  const flushUntil = async (condition: () => boolean, maxIterations: number = 10) => {
    for (let i = 0; i < maxIterations; i++) {
      if (condition()) return;
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    }

    expect(condition()).toBe(true);
  };

  /**
   * Flush the JsonEditor debounce window.
   *
   * The wizard's JsonEditor debounces updates by ~300ms. We only need to advance that window
   * so the provider captures the latest content; running *all* timers is slower and can
   * unintentionally flush unrelated timers.
   */
  const flushJsonEditorDebounce = async () => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
  };

  /**
   * Complete step 1 (Logistics): Name, index patterns, priority, version, lifecycle, index mode
   */
  const completeStepOne = async (stepOptions: CompleteStepOneOptions = {}) => {
    const { indexPatterns, priority, allowAutoCreate, version, lifecycle, indexMode, name } =
      stepOptions;

    if (name) {
      const nameRow = screen.getByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      fireEvent.change(nameInput, { target: { value: name } });
    }

    if (indexMode) {
      // Set indexMode before indexPatterns to avoid any automatic reset logic
      // First ensure the toggle is checked (setIndexMode must be true for indexMode to persist)
      const toggle = screen.getByTestId('toggleIndexMode');
      const isChecked = toggle.getAttribute('aria-checked') === 'true';
      if (!isChecked) {
        fireEvent.click(toggle);
        await flushUntil(() => screen.queryByTestId('indexModeField') !== null);
      }
      const indexModeSelect = screen.getByTestId('indexModeField');
      // Try clicking first to see if dropdown opens (for real SuperSelect)
      fireEvent.click(indexModeSelect);
      await flushPending();

      // Map indexMode values to their test-subj values
      const indexModeTestSubjMap: Record<string, string> = {
        standard: 'index_mode_standard',
        time_series: 'index_mode_time_series',
        logsdb: 'index_mode_logsdb',
        lookup: 'index_mode_logsdb', // Note: lookup and logsdb share the same test-subj
      };
      const optionTestSubj = indexModeTestSubjMap[indexMode];

      // Try to find the option in the dropdown (if SuperSelect opened)
      // Use queryAllByTestId and filter by id attribute since logsdb and lookup share the same test-subj
      const options = screen.queryAllByTestId(optionTestSubj);
      const option = options.find((el) => el.getAttribute('id') === indexMode);
      if (option) {
        // SuperSelect opened, click the option
        fireEvent.click(option);
      } else {
        // SuperSelect is mocked as input, use change event directly
        // The value must match one of the option values exactly
        fireEvent.change(indexModeSelect, { target: { value: indexMode }, bubbles: true });
        fireEvent.blur(indexModeSelect);
      }
      // Wait for form state to update after selection
      await flushPending(2);
    }

    if (indexPatterns) {
      await screen.findByTestId('indexPatternsField');
      const indexPatternsComboBox = new EuiComboBoxTestHarness('indexPatternsField');

      // Clear existing selections first
      indexPatternsComboBox.clearSelection();

      // Add each pattern
      for (const pattern of indexPatterns) {
        indexPatternsComboBox.selectOption(pattern);
      }
      // Wait for indexPatterns to be set before proceeding
      await flushPending();
    }

    if (priority !== undefined) {
      const priorityRow = screen.getByTestId('priorityField');
      const priorityInput = within(priorityRow).getByRole('spinbutton');
      fireEvent.change(priorityInput, { target: { value: String(priority) } });
    }

    if (version !== undefined) {
      const versionRow = screen.getByTestId('versionField');
      const versionInput = within(versionRow).getByRole('spinbutton');
      fireEvent.change(versionInput, { target: { value: String(version) } });
    }

    if (lifecycle) {
      const lifecycleSwitchRow = screen.getByTestId('dataRetentionToggle');
      const lifecycleSwitch = within(lifecycleSwitchRow).getByRole('switch');
      fireEvent.click(lifecycleSwitch);

      await screen.findByTestId('valueDataRetentionField');

      const retentionInput = screen.getByTestId('valueDataRetentionField');
      fireEvent.change(retentionInput, { target: { value: String(lifecycle.value) } });
    }

    if (allowAutoCreate) {
      const autoCreateRow = screen.getByTestId('allowAutoCreateField');

      let labelMatch = /Do not overwrite/;
      if (allowAutoCreate === 'TRUE') labelMatch = /True/;
      if (allowAutoCreate === 'FALSE') labelMatch = /False/;

      const radio = within(autoCreateRow).getByLabelText(labelMatch);
      fireEvent.click(radio);
    }

    // Wait for next button to be enabled (form validation complete)
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());

    fireEvent.click(screen.getByTestId('nextButton'));
    await flushPending();
    await screen.findByTestId('stepComponents');

    // Wait for component templates to finish loading
    // The selector will show either the list or an empty prompt
    await waitFor(() => {
      const hasTemplatesList = screen.queryByTestId('componentTemplatesSelection') !== null;
      const hasEmptyPrompt = screen.queryByTestId('emptyPrompt') !== null;
      return hasTemplatesList || hasEmptyPrompt;
    });
  };

  /**
   * Complete step 2 (Component templates): Select optional component templates
   */
  const completeStepTwo = async (componentName?: string) => {
    if (componentName) {
      // Get the component templates list container
      const listContainer = await screen.findByTestId('componentTemplatesList');
      // Find all component name elements within the list
      const componentNames = within(listContainer).getAllByTestId('name');
      const componentsFound = componentNames.map((el) => el.textContent);
      const index = componentsFound.indexOf(componentName);
      if (index >= 0) {
        // Find all add buttons within the list
        const addButtons = within(listContainer).getAllByTestId('action-plusInCircle');
        fireEvent.click(addButtons[index]);
      }
    }

    fireEvent.click(screen.getByTestId('nextButton'));
    await flushPending();
    await screen.findByTestId('stepSettings');
  };

  /**
   * Complete step 3 (Index settings): Optional JSON settings
   */
  const completeStepThree = async (settingsJson?: string, shouldNavigate: boolean = true) => {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await flushPending();
    if (shouldNavigate) {
      await screen.findByTestId('stepMappings');
    }
  };

  /**
   * Complete step 4 (Mappings): Add mapping fields
   */
  const completeStepFour = async (
    mappingFields?: Array<{ name: string; type: string }>,
    shouldNavigate: boolean = true
  ) => {
    if (mappingFields) {
      // Prefer the "Load JSON" modal when we need deterministic mappings.
      // It avoids flaky EuiComboBox interactions (the field type form defaults to "text").
      const mappingsJson = {
        properties: mappingFields.reduce<Record<string, { type: string }>>((acc, field) => {
          acc[field.name] = { type: field.type };
          return acc;
        }, {}),
      };

      const loadJsonButton = screen.getByRole('button', { name: 'Load JSON' });
      fireEvent.click(loadJsonButton);

      // Wait for modal controls to appear
      const confirmButton = await screen.findByRole('button', { name: 'Load and overwrite' });

      // JsonEditor uses CodeEditor under the hood; in tests we mock it as an <input />
      const jsonEditorInput = screen.getByTestId('mockCodeEditor');
      fireEvent.change(jsonEditorInput, {
        target: { value: JSON.stringify(mappingsJson, null, 2) },
      });

      // JsonEditor debounces updates by ~300ms; flush that window so the provider captures jsonContent.current.
      await flushJsonEditorDebounce();

      fireEvent.click(confirmButton);

      await flushPending();
    }

    await screen.findByTestId('documentFields');

    // When we are staying on this step (e.g. tests that only verify mapping editing),
    // avoid waiting for navigation-related validation. It can be significantly slower
    // and is not needed for verifying the mappings UI state.
    if (!shouldNavigate) return;

    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());

    fireEvent.click(screen.getByTestId('nextButton'));

    // Fix for act warning from template_clone
    await flushUntil(() => screen.queryByTestId('stepAliases') !== null);

    await screen.findByTestId('stepAliases');
  };

  /**
   * Complete step 5 (Aliases): Optional JSON aliases
   */
  const completeStepFive = async (aliasesJson?: string, shouldNavigate: boolean = true) => {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await flushPending();
    if (shouldNavigate) {
      await screen.findByTestId('summaryTabContent');
    }
  };

  return {
    completeStepOne,
    completeStepTwo,
    completeStepThree,
    completeStepFour,
    completeStepFive,
  };
};
