/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { StepMappings } from './step_mappings';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { AppContextProvider, type AppDependencies } from '../../../../app_context';
import { MappingsEditorProvider } from '../../../mappings_editor';
import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';

jest.mock('@kbn/code-editor');

describe('<StepMappings />', () => {
  test('allows you to add mappings', async () => {
    const onChange = jest.fn();

    const Comp = () => (
      <StepMappings
        defaultValue={{ properties: {} }}
        onChange={onChange}
        esDocsBase="https://example.test"
        esNodesPlugins={[]}
      />
    );

    const docLinks = docLinksServiceMock.createStartContract();
    const appDependencies = {
      docLinks,
      canUseSyntheticSource: false,
    } as unknown as AppDependencies;

    render(
      <I18nProvider>
        <AppContextProvider value={appDependencies}>
          <MappingsEditorProvider>
            <GlobalFlyout.GlobalFlyoutProvider>
              <Comp />
            </GlobalFlyout.GlobalFlyoutProvider>
          </MappingsEditorProvider>
        </AppContextProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('stepMappings')).toBeInTheDocument();

    const nameInput = await screen.findByTestId('nameParameterInput');
    fireEvent.change(nameInput, { target: { value: 'field_1' } });

    const createFieldForm = screen.getByTestId('createFieldForm');
    await within(createFieldForm).findByTestId('fieldType');

    const fieldTypeComboBox = new EuiComboBoxTestHarness('fieldType');
    await fieldTypeComboBox.select('text');
    await fieldTypeComboBox.close();

    fireEvent.click(screen.getByTestId('addButton'));

    await waitFor(() => {
      expect(screen.getAllByTestId(/fieldsListItem/)).toHaveLength(1);
    });
  });
});
