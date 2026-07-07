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
import { i18nServiceMock, themeServiceMock, analyticsServiceMock } from '@kbn/core/public/mocks';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { CoreStart, HttpSetup } from '@kbn/core/public';

import { ComponentTemplateEdit } from '../../../component_template_wizard';
import { BASE_PATH } from '../../../../../../../common';
import { WithAppDependencies } from './setup_environment';

// Services required for KibanaRenderContextProvider (provides i18n, theme, analytics)
const startServicesMock = {
  i18n: i18nServiceMock.createStartContract(),
  theme: themeServiceMock.createStartContract(),
  analytics: analyticsServiceMock.createAnalyticsServiceStart(),
};

export const renderComponentTemplateEdit = (
  httpSetup: HttpSetup,
  coreStart?: CoreStart,
  queryParams: string = ''
) => {
  const routePath = `${BASE_PATH}/edit_component_template/comp-1${queryParams}`;
  const EditWithRouter = () => (
    <MemoryRouter initialEntries={[routePath]}>
      <Route
        path={`${BASE_PATH}/edit_component_template/:name`}
        component={ComponentTemplateEdit}
      />
    </MemoryRouter>
  );

  return render(
    <KibanaRenderContextProvider {...startServicesMock}>
      {React.createElement(WithAppDependencies(EditWithRouter, httpSetup, coreStart))}
    </KibanaRenderContextProvider>
  );
};

/**
 * Helper to complete form steps (reusing from component_template_create pattern)
 */
export const getEnabledNextButton = () => {
  const nextButtons = screen.getAllByTestId('nextButton');
  const enabled = nextButtons.find((btn) => !btn.hasAttribute('disabled'));
  if (!enabled) {
    throw new Error('Expected at least one enabled "nextButton"');
  }
  return enabled;
};

export const getVersionSpinButton = () => {
  const versionRows = screen.getAllByTestId('versionField');
  const versionRow = versionRows.find((row) => within(row).queryByRole('spinbutton') !== null);
  if (!versionRow) {
    throw new Error('Expected a versionField row containing a spinbutton');
  }
  return within(versionRow).getByRole('spinbutton');
};

interface MappingField {
  name: string;
  type: string;
}

export const completeStep = {
  async settings(settingsJson?: string) {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    const enabledNextButton = getEnabledNextButton();
    await waitFor(() => expect(enabledNextButton).toBeEnabled());
    fireEvent.click(enabledNextButton);
    await screen.findByTestId('stepMappings');
  },
  async mappings(mappingFields?: MappingField[]) {
    if (mappingFields) {
      for (const field of mappingFields) {
        const { name, type } = field;
        const createFieldForm = screen.getByTestId('createFieldForm');

        const nameInput = screen.getByTestId('nameParameterInput');
        fireEvent.change(nameInput, { target: { value: name } });

        const typeSelect = within(createFieldForm).getByTestId('mockComboBox');
        fireEvent.change(typeSelect, { target: { value: type } });

        const addButton = within(createFieldForm).getByTestId('addButton');
        const fieldsBefore = screen.queryAllByText(name).length;

        fireEvent.click(addButton);

        await waitFor(() => {
          expect(screen.queryAllByText(name).length).toBeGreaterThan(fieldsBefore);
        });
      }
    }

    await screen.findByTestId('documentFields');
    const enabledNextButton = getEnabledNextButton();
    await waitFor(() => expect(enabledNextButton).toBeEnabled());
    fireEvent.click(enabledNextButton);

    await screen.findByTestId('stepAliases');
  },
  async aliases(aliasesJson?: string) {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    const enabledNextButton = getEnabledNextButton();
    await waitFor(() => expect(enabledNextButton).toBeEnabled());
    fireEvent.click(enabledNextButton);
    await screen.findByTestId('stepReview');
  },
};
