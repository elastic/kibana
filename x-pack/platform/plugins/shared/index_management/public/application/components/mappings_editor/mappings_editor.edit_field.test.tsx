/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import SemVer from 'semver/classes/semver';
import { docLinksServiceMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';

import { MAJOR_VERSION } from '../../../../common';
import { useAppContext } from '../../app_context';
import { MappingsEditor } from './mappings_editor';
import { MappingsEditorProvider } from './mappings_editor_context';
import { createKibanaReactContext } from './shared_imports';

type UseFieldType = typeof import('./shared_imports').UseField;
type GetFieldConfigType = typeof import('./lib').getFieldConfig;

jest.mock('@kbn/code-editor');

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiPortal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    EuiOverlayMask: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('./components/document_fields/field_parameters/type_parameter', () => {
  const sharedImports = jest.requireActual('./shared_imports');
  const lib = jest.requireActual('./lib');
  const UseFieldActual = sharedImports.UseField as UseFieldType;
  const getFieldConfigActual = lib.getFieldConfig as GetFieldConfigType;

  const options = [
    { value: 'text', label: 'text' },
    { value: 'range', label: 'range' },
    { value: 'date_range', label: 'date_range' },
    { value: 'other', label: 'other' },
  ];

  const TypeParameter = () => (
    <UseFieldActual<Array<{ value: string; label: string }>>
      path="type"
      config={getFieldConfigActual<Array<{ value: string; label: string }>>('type')}
    >
      {(field) => {
        return (
          <select
            data-test-subj="fieldType"
            defaultValue={field.value?.[0]?.value ?? ''}
            onBlur={(e) => field.setValue([{ value: e.target.value, label: e.target.value }])}
          >
            <option value="" />
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }}
    </UseFieldActual>
  );

  return { __esModule: true, TypeParameter };
});

jest.mock('../../app_context', () => {
  const actual = jest.requireActual('../../app_context');
  return {
    ...actual,
    useAppContext: jest.fn(),
  };
});

const { GlobalFlyoutProvider } = GlobalFlyout;
const mockUseAppContext = useAppContext as unknown as jest.MockedFunction<typeof useAppContext>;
const docLinks = docLinksServiceMock.createStartContract();
const kibanaVersion = new SemVer(MAJOR_VERSION);
const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

const defaultTextParameters = {
  type: 'text',
  eager_global_ordinals: false,
  fielddata: false,
  index: true,
  index_options: 'positions',
  index_phrases: false,
  norms: true,
  store: false,
};

const defaultDateRangeParameters = {
  type: 'date_range',
  coerce: true,
  index: true,
  store: false,
};

describe('Mappings editor: edit field', () => {
  const onChangeHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppContext.mockReturnValue({
      canUseSyntheticSource: true,
      config: {
        enableMappingsSourceFieldSection: false,
      },
    } as unknown as ReturnType<typeof useAppContext>);
  });

  const getFieldListItemById = (id: string) => screen.getByTestId(`fieldsListItem ${id}Field`);

  type MappingsEditorProps = ComponentProps<typeof MappingsEditor>;

  const setup = (props: Partial<MappingsEditorProps>) => {
    return render(
      <React.Fragment>
        <I18nProvider>
          <KibanaReactContextProvider>
            <MappingsEditorProvider>
              <GlobalFlyoutProvider>
                <MappingsEditor
                  {...props}
                  docLinks={docLinks}
                  esNodesPlugins={[]}
                  onChange={onChangeHandler}
                />
              </GlobalFlyoutProvider>
            </MappingsEditorProvider>
          </KibanaReactContextProvider>
        </I18nProvider>
      </React.Fragment>
    );
  };

  describe('WHEN a nested field edit button is clicked', () => {
    it('SHOULD open a flyout with the correct field to edit', async () => {
      const defaultMappings = {
        properties: {
          user: {
            type: 'object',
            properties: {
              street: { type: 'text' },
            },
          },
        },
      };

      setup({ value: defaultMappings, onChange: onChangeHandler, indexSettings: {} });

      const userField = await screen.findByTestId('fieldsListItem userField');
      fireEvent.click(within(userField).getByTestId('toggleExpandButton'));

      const streetListItem = await screen.findByTestId('fieldsListItem userstreetField');

      fireEvent.click(within(streetListItem).getByTestId('editFieldButton'));

      const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

      const flyoutTitle = within(flyout).getByTestId('flyoutTitle');
      expect(flyoutTitle.textContent).toEqual(`Edit field 'street'`);

      const fieldPath = within(flyout).getByTestId('fieldPath');
      expect(fieldPath.textContent).toEqual('user > street');
    });
  });

  describe('WHEN the field datatype is changed', () => {
    it('SHOULD update form parameters accordingly', async () => {
      const defaultMappings = {
        properties: {
          userName: {
            ...defaultTextParameters,
          },
        },
      };

      setup({ value: defaultMappings, onChange: onChangeHandler, indexSettings: {} });

      await screen.findByTestId('mappingsEditor');
      await screen.findByTestId('fieldsList');

      const userNameListItem = getFieldListItemById('userName');
      expect(userNameListItem).toBeInTheDocument();

      fireEvent.click(within(userNameListItem).getByTestId('editFieldButton'));

      const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

      const fieldTypeSelect = within(flyout).getByTestId('fieldType');
      fireEvent.change(fieldTypeSelect, { target: { value: 'range' } });
      fireEvent.blur(fieldTypeSelect);

      await within(flyout).findByTestId('fieldSubType');

      const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
      await waitFor(() => {
        expect(updateButton).not.toBeDisabled();
      });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.queryByTestId('mappingsEditorFieldEdit')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
        const data = lastCall.getData(lastCall.isValid ?? true);

        const updatedMappings = {
          ...defaultMappings,
          properties: {
            userName: {
              ...defaultDateRangeParameters,
            },
          },
        };

        expect(data).toEqual(updatedMappings);
      });
    });
  });

  describe('WHEN the field editor is opened without changes', () => {
    it('SHOULD have the Update button disabled until changes are made', async () => {
      const defaultMappings = {
        properties: {
          myField: {
            type: 'text',
          },
        },
      };

      setup({ value: defaultMappings, onChange: onChangeHandler, indexSettings: {} });

      await screen.findByTestId('mappingsEditor');
      await screen.findByTestId('fieldsList');

      const myFieldListItem = getFieldListItemById('myField');

      fireEvent.click(within(myFieldListItem).getByTestId('editFieldButton'));

      const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

      const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
      expect(updateButton).toBeDisabled();

      fireEvent.change(within(flyout).getByTestId('nameParameterInput'), {
        target: { value: 'updatedField' },
      });
      expect(updateButton).not.toBeDisabled();
    });
  });
});
