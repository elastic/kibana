/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaseSeverity, ConnectorTypes } from '../../../common/types/domain';
import { mockedTestProvidersOwner, renderWithTestingProviders } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { useGetChoicesResponse } from '../create/mock';
import { connectorsMock, customFieldsConfigurationMock } from '../../containers/mock';
import { TEMPLATE_FIELDS, CASE_FIELDS, CONNECTOR_FIELDS, CASE_SETTINGS } from './translations';
import { FormFields } from './form_fields';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../connectors/servicenow/use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

describe('form fields', () => {
  const onSubmit = jest.fn();
  const formDefaultValue = { tags: [], templateTags: [] };
  const defaultProps = {
    connectors: connectorsMock,
    currentConfiguration: {
      closureType: 'close-by-user' as const,
      connector: {
        fields: null,
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
      },
      customFields: [],
      templates: [],
      mappings: [],
      version: '',
      id: '',
      owner: mockedTestProvidersOwner[0],
      observableTypes: [],
      extractObservables: true,
      workflowTags: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
  });

  it('renders all steps', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByText(TEMPLATE_FIELDS)).toBeInTheDocument();
    expect(await screen.findByText(CASE_FIELDS)).toBeInTheDocument();
    expect(await screen.findByText(CASE_SETTINGS)).toBeInTheDocument();
    expect(await screen.findByText(CONNECTOR_FIELDS)).toBeInTheDocument();
  });

  it('renders template fields correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('template-name-input')).toBeInTheDocument();
    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('template-description-input')).toBeInTheDocument();
  });

  it('renders case fields', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('renders case fields with existing value', async () => {
    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{
          title: 'Case title',
          description: 'case description',
          tags: ['case-1', 'case-2'],
          category: 'new',
          severity: CaseSeverity.MEDIUM,
          templateTags: [],
        }}
        onSubmit={onSubmit}
      >
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await within(await screen.findByTestId('caseTitle')).findByTestId('input')).toHaveValue(
      'Case title'
    );

    const caseTags = await screen.findByTestId('caseTags');
    expect(await within(caseTags).findByTestId('comboBoxInput')).toHaveTextContent('case-1');
    expect(await within(caseTags).findByTestId('comboBoxInput')).toHaveTextContent('case-2');

    const category = await screen.findByTestId('caseCategory');
    expect(await within(category).findByTestId('comboBoxSearchInput')).toHaveValue('new');
    expect(await screen.findByTestId('case-severity-selection-medium')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toHaveTextContent('case description');
  });

  it('renders sync alerts correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseSyncAlerts')).toBeInTheDocument();
  });

  it('renders custom fields correctly', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        customFields: customFieldsConfigurationMock,
      },
    };

    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
  });

  it('renders default connector correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
  });

  it('renders connector and its fields correctly', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        connector: {
          id: 'servicenow-1',
          name: 'My SN connector',
          type: ConnectorTypes.serviceNowITSM,
          fields: null,
        },
      },
    };

    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{ ...formDefaultValue, connectorId: 'servicenow-1' }}
        onSubmit={onSubmit}
      >
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();
  });

  it('does not render sync alerts when feature is not enabled', () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>,
      { wrapperProps: { owner: ['observability'] } }
    );

    expect(screen.queryByTestId('caseSyncAlerts')).not.toBeInTheDocument();
  });

  it('calls onSubmit with template fields', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByTestId('template-name-input'));
    await userEvent.paste('Template 1');

    const templateTags = await screen.findByTestId('template-tags');

    await userEvent.click(within(templateTags).getByRole('combobox'));
    await userEvent.paste('first');
    await userEvent.keyboard('{enter}');

    await userEvent.click(await screen.findByTestId('template-description-input'));
    await userEvent.paste('this is a first template');

    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          category: null,
          connectorId: 'none',
          tags: [],
          syncAlerts: true,
          name: 'Template 1',
          templateDescription: 'this is a first template',
          templateTags: ['first'],
        },
        true
      );
    });
  });

  it('calls onSubmit with case fields', async () => {
    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{
          title: 'Case with Template 1',
          description: 'This is a case description',
          tags: ['template-1'],
          category: 'new',
          templateTags: [],
        }}
        onSubmit={onSubmit}
      >
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          category: 'new',
          tags: ['template-1'],
          description: 'This is a case description',
          title: 'Case with Template 1',
          connectorId: 'none',
          syncAlerts: true,
          templateTags: [],
        },
        true
      );
    });
  });

  it('calls onSubmit with custom fields', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        customFields: customFieldsConfigurationMock,
      },
    };

    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{
          ...formDefaultValue,
          customFields: {
            [customFieldsConfigurationMock[0].key]: 'My text test value 1',
            [customFieldsConfigurationMock[1].key]: false,
            [customFieldsConfigurationMock[4].key]: '987',
          },
        }}
        onSubmit={onSubmit}
      >
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          category: null,
          tags: [],
          connectorId: 'none',
          customFields: {
            test_key_1: 'My text test value 1',
            test_key_2: false,
            test_key_4: false,
            test_key_5: '987',
          },
          syncAlerts: true,
          templateTags: [],
        },
        true
      );
    });
  });

  it('calls onSubmit with connector fields', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        connector: {
          id: 'servicenow-1',
          name: 'My SN connector',
          type: ConnectorTypes.serviceNowITSM,
          fields: null,
        },
      },
    };

    renderWithTestingProviders(
      <FormTestComponent
        formDefaultValue={{ ...formDefaultValue, connectorId: 'servicenow-1' }}
        onSubmit={onSubmit}
      >
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();

    await userEvent.selectOptions(await screen.findByTestId('severitySelect'), '3');

    await userEvent.selectOptions(await screen.findByTestId('urgencySelect'), '2');

    await userEvent.selectOptions(await screen.findByTestId('categorySelect'), ['software']);

    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          tags: [],
          category: null,
          connectorId: 'servicenow-1',
          fields: {
            category: 'software',
            severity: '3',
            urgency: '2',
            subcategory: null,
          },
          syncAlerts: true,
          templateTags: [],
        },
        true
      );
    });
  });

  it('does not render duplicate template tags', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        templates: [
          {
            key: 'test_template_1',
            name: 'Test',
            tags: ['one', 'two'],
            caseFields: {},
          },
          {
            key: 'test_template_2',
            name: 'Test 2',
            tags: ['one', 'three'],
            caseFields: {},
          },
        ],
      },
    };

    renderWithTestingProviders(
      <FormTestComponent onSubmit={onSubmit} formDefaultValue={formDefaultValue}>
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    const caseTags = await screen.findByTestId('template-tags');

    await userEvent.click(within(caseTags).getByTestId('comboBoxToggleListButton'));
    await waitForEuiPopoverOpen();

    /**
     * RTL will throw an error if there are more that one
     * element matching the text. This ensures that duplicated
     * tags are removed. Docs: https://testing-library.com/docs/queries/about
     */
    expect(await screen.findByText('one'));
    expect(await screen.findByText('two'));
    expect(await screen.findByText('three'));
  });
});
