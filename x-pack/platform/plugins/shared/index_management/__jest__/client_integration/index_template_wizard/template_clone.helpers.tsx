/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';
import type { HttpSetup } from '@kbn/core/public';

import { getComposableTemplate } from '../../../test/fixtures';
import { TEMPLATE_NAME, INDEX_PATTERNS as DEFAULT_INDEX_PATTERNS } from './constants';
import { TemplateClone } from '../../../public/application/sections/template_clone';
import { WithAppDependencies } from '../helpers/setup_environment';

export const templateToClone = getComposableTemplate({
  name: TEMPLATE_NAME,
  indexPatterns: ['indexPattern1'],
  template: {},
  allowAutoCreate: 'TRUE',
});

/**
 * Helper to render template clone component with routing (RTL).
 */
export const renderTemplateClone = (httpSetup: HttpSetup) => {
  const CloneWithRouter = () => (
    <MemoryRouter initialEntries={[`/clone_template/${TEMPLATE_NAME}`]}>
      <Route path="/clone_template/:name" component={TemplateClone} />
    </MemoryRouter>
  );

  return render(React.createElement(WithAppDependencies(CloneWithRouter, httpSetup)));
};

type AllowAutoCreateValue = 'TRUE' | 'FALSE' | 'DO_NOT_OVERWRITE';

interface StepOneOptions {
  indexPatterns?: string[];
  priority?: number;
  allowAutoCreate?: AllowAutoCreateValue;
  version?: number;
  lifecycle?: { value: number | string };
}

/**
 * Helper to fill form step-by-step.
 */
export const completeStep = {
  async one({ indexPatterns, priority, allowAutoCreate, version, lifecycle }: StepOneOptions = {}) {
    if (indexPatterns) {
      await screen.findByTestId('indexPatternsField');
      const indexPatternsComboBox = new EuiComboBoxTestHarness('indexPatternsField');

      // Clear existing selections first
      indexPatternsComboBox.clearSelection();

      // Add each pattern
      for (const pattern of indexPatterns) {
        indexPatternsComboBox.selectOption(pattern);
      }
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
      const isEnabled = lifecycleSwitch.getAttribute('aria-checked') === 'true';
      if (!isEnabled) {
        fireEvent.click(lifecycleSwitch);
      }
      const retentionInput = await screen.findByTestId('valueDataRetentionField');
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

    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepComponents');

    // The selector will show either the list or an empty prompt
    await waitFor(() => {
      const hasTemplatesList = screen.queryByTestId('componentTemplatesSelection') !== null;
      const hasEmptyPrompt = screen.queryByTestId('emptyPrompt') !== null;
      return hasTemplatesList || hasEmptyPrompt;
    });
  },
  async two() {
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepSettings');
  },
  async three(settingsJson?: string) {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepMappings');
  },
  async four() {
    await screen.findByTestId('documentFields');
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepAliases');
  },
  async five(aliasesJson?: string) {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('summaryTabContent');
  },
};

export const DEFAULT_INDEX_PATTERNS_FOR_CLONE = DEFAULT_INDEX_PATTERNS;
