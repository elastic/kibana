/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { StepLogistics } from './step_logistics';
import { AppContextProvider } from '../../../app_context';
import type { AppDependencies } from '../../../app_context';

const ctx = {
  config: { enableIndexMode: true },
} as unknown as AppDependencies;

describe('StepLogistics', () => {
  const baseDefaultValue = {
    name: 'my_template',
    indexPatterns: ['index-*'],
    indexMode: 'standard',
    allowAutoCreate: 'NO_OVERWRITE',
    _meta: {},
    priority: 1,
    version: 1,
    dataStream: {},
    lifecycle: { enabled: false, value: 1, unit: 'd' },
  };

  describe('WHEN editing an existing template', () => {
    it('SHOULD disable the name field', async () => {
      render(
        <I18nProvider>
          <AppContextProvider value={ctx}>
            <StepLogistics
              defaultValue={baseDefaultValue}
              isEditing={true}
              onChange={jest.fn()}
              isLegacy={false}
            />
          </AppContextProvider>
        </I18nProvider>
      );

      const nameRow = await screen.findByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      expect(nameInput).toBeDisabled();
    });
  });

  describe('WHEN creating a new template', () => {
    it('SHOULD enable the name field', async () => {
      render(
        <I18nProvider>
          <AppContextProvider value={ctx}>
            <StepLogistics
              defaultValue={baseDefaultValue}
              isEditing={false}
              onChange={jest.fn()}
              isLegacy={false}
            />
          </AppContextProvider>
        </I18nProvider>
      );

      const nameRow = await screen.findByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      expect(nameInput).toBeEnabled();
    });
  });
});
