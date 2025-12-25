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

import { TEMPLATE_NAME, MAPPINGS as DEFAULT_MAPPING } from './constants';
import { TemplateEdit } from '../../../public/application/sections/template_edit';
import { WithAppDependencies } from '../helpers/setup_environment';

export const UPDATED_INDEX_PATTERN = ['updatedIndexPattern'];
export const UPDATED_MAPPING_TEXT_FIELD_NAME = 'updated_text_datatype';
export const MAPPING = {
  ...DEFAULT_MAPPING,
  properties: {
    text_datatype: {
      type: 'text',
    },
  },
};

export const NONEXISTENT_COMPONENT_TEMPLATE = {
  name: 'component_template@custom',
  hasMappings: false,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
};

export const EXISTING_COMPONENT_TEMPLATE = {
  name: 'test_component_template',
  hasMappings: true,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
  isManaged: false,
};

/**
 * Helper to render TemplateEdit component with routing (RTL).
 */
export const renderTemplateEdit = (httpSetup: HttpSetup, templateName: string = TEMPLATE_NAME) => {
  const EditWithRouter = () => (
    <MemoryRouter initialEntries={[`/edit_template/${templateName}`]}>
      <Route path="/edit_template/:name" component={TemplateEdit} />
    </MemoryRouter>
  );

  return render(React.createElement(WithAppDependencies(EditWithRouter, httpSetup)));
};

type AllowAutoCreateValue = 'TRUE' | 'FALSE' | 'NO_OVERWRITE';

interface StepOneOptions {
  indexPatterns?: string[];
  priority?: number;
  allowAutoCreate?: AllowAutoCreateValue;
  version?: number;
  lifecycle?: { value: number | string; unit?: string };
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
      // `TemplateEdit` tests pass `{ lifecycle: { value, unit } }` meaning "enable lifecycle"
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
