/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useGetChoices } from '../lib/servicenow/use_get_choices';
import ServiceNowSIRParamsFields from './servicenow_sir_params';
import type { Choice } from '../lib/servicenow/types';
import { merge } from 'lodash';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

jest.mock('../lib/servicenow/use_get_choices');
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const useGetChoicesMock = useGetChoices as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      short_description: 'sn title',
      description: 'some description',
      category: 'Denial of Service',
      dest_ip: '192.168.1.1',
      source_ip: '192.168.1.2',
      malware_hash: '098f6bcd4621d373cade4e832627b4f6',
      malware_url: 'https://attack.com',
      priority: '1',
      subcategory: '20',
      externalId: null,
      correlation_id: 'alertID',
      correlation_display: 'Alerting',
      additional_fields: null,
    },
    comments: [],
  },
};

const connector: ActionConnector = createMockActionConnector({
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
});

const editAction = jest.fn();
const defaultProps = {
  actionConnector: connector,
  actionParams,
  errors: { ['subActionParams.incident.short_description']: [] },
  editAction,
  index: 0,
  messageVariables: [],
};

const choicesResponse = {
  isLoading: false,
  choices: [
    {
      dependent_value: '',
      label: 'Priviledge Escalation',
      value: 'Priviledge Escalation',
      element: 'category',
    },
    {
      dependent_value: '',
      label: 'Criminal activity/investigation',
      value: 'Criminal activity/investigation',
      element: 'category',
    },
    {
      dependent_value: '',
      label: 'Denial of Service',
      value: 'Denial of Service',
      element: 'category',
    },
    {
      dependent_value: '',
      label: 'Failed Login',
      value: 'failed_login',
      element: 'category',
    },
    {
      dependent_value: 'Denial of Service',
      label: 'Inbound or outbound',
      value: '12',
      element: 'subcategory',
    },
    {
      dependent_value: 'Denial of Service',
      label: 'Single or distributed (DoS or DDoS)',
      value: '26',
      element: 'subcategory',
    },
    {
      dependent_value: 'Denial of Service',
      label: 'Inbound DDos',
      value: 'inbound_ddos',
      element: 'subcategory',
    },
    {
      dependent_value: '',
      label: '1 - Critical',
      value: '1',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '2 - High',
      value: '2',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '3 - Moderate',
      value: '3',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '4 - Low',
      value: '4',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '5 - Planning',
      value: '5',
      element: 'priority',
    },
  ],
};

describe('ServiceNowSIRParamsFields renders', () => {
  let onChoicesSuccess = (choices: Choice[]) => {};

  beforeEach(() => {
    jest.clearAllMocks();
    useGetChoicesMock.mockImplementation((args) => {
      onChoicesSuccess = args.onSuccess;
      return choicesResponse;
    });
  });

  test('all params fields is rendered', () => {
    renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);
    act(() => {
      onChoicesSuccess(choicesResponse.choices);
    });
    expect(screen.getByTestId('short_descriptionInput')).toBeInTheDocument();
    expect(screen.getByTestId('correlation_idInput')).toBeInTheDocument();
    expect(screen.getByTestId('correlation_displayInput')).toBeInTheDocument();
    expect(screen.getByTestId('prioritySelect')).toBeInTheDocument();
    expect(screen.getByTestId('categorySelect')).toBeInTheDocument();
    expect(screen.getByTestId('subcategorySelect')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();
  });

  test('If short_description has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.short_description': ['error'] },
    };
    renderWithI18n(<ServiceNowSIRParamsFields {...newProps} />);
    const titleInput = screen.getByTestId('short_descriptionInput');
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('When subActionParams is undefined, set to default', () => {
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    renderWithI18n(<ServiceNowSIRParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {
        correlation_id: '{{rule.id}}:{{alert.id}}',
      },
      comments: [],
    });
  });

  test('When subAction is undefined, set to default', () => {
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    renderWithI18n(<ServiceNowSIRParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });

  test('Resets fields when connector changes', () => {
    const { rerender } = renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    rerender(
      <I18nProvider>
        <ServiceNowSIRParamsFields
          {...defaultProps}
          actionConnector={{ ...connector, id: '1234' }}
        />
      </I18nProvider>
    );
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {
        correlation_id: '{{rule.id}}:{{alert.id}}',
      },
      comments: [],
    });
  });

  test('it transforms the categories to options correctly', async () => {
    renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);
    act(() => {
      onChoicesSuccess(choicesResponse.choices);
    });

    const categorySelect = screen.getByTestId('categorySelect');
    const options = within(categorySelect)
      .getAllByRole('option')
      .map((opt) => ({
        value: (opt as HTMLOptionElement).value,
        text: opt.textContent,
      }));
    expect(options).toEqual([
      { value: 'Priviledge Escalation', text: 'Priviledge Escalation' },
      {
        value: 'Criminal activity/investigation',
        text: 'Criminal activity/investigation',
      },
      { value: 'Denial of Service', text: 'Denial of Service' },
      { value: 'failed_login', text: 'Failed Login' },
    ]);
  });

  test('it transforms the subcategories to options correctly', async () => {
    renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);
    act(() => {
      onChoicesSuccess(choicesResponse.choices);
    });

    const subcategorySelect = screen.getByTestId('subcategorySelect');
    const options = within(subcategorySelect)
      .getAllByRole('option')
      .map((opt) => ({
        value: (opt as HTMLOptionElement).value,
        text: opt.textContent,
      }));
    expect(options).toEqual([
      {
        text: 'Inbound or outbound',
        value: '12',
      },
      {
        text: 'Single or distributed (DoS or DDoS)',
        value: '26',
      },
      {
        text: 'Inbound DDos',
        value: 'inbound_ddos',
      },
    ]);
  });

  test('it transforms the priorities to options correctly', async () => {
    renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);
    act(() => {
      onChoicesSuccess(choicesResponse.choices);
    });

    const prioritySelect = screen.getByTestId('prioritySelect');
    const options = within(prioritySelect)
      .getAllByRole('option')
      .map((opt) => ({
        value: (opt as HTMLOptionElement).value,
        text: opt.textContent,
      }));
    expect(options).toEqual([
      {
        text: '1 - Critical',
        value: '1',
      },
      {
        text: '2 - High',
        value: '2',
      },
      {
        text: '3 - Moderate',
        value: '3',
      },
      {
        text: '4 - Low',
        value: '4',
      },
      {
        text: '5 - Planning',
        value: '5',
      },
    ]);
  });

  it('should hide subcategory if selecting a category without subcategories', async () => {
    const newProps = merge({}, defaultProps, {
      actionParams: {
        subActionParams: {
          incident: {
            category: 'failed_login',
            subcategory: null,
          },
        },
      },
    });
    renderWithI18n(<ServiceNowSIRParamsFields {...newProps} />);
    act(() => {
      onChoicesSuccess(choicesResponse.choices);
    });
    expect(screen.queryByTestId('subcategorySelect')).not.toBeInTheDocument();
  });

  describe('UI updates', () => {
    const simpleFields = [
      {
        dataTestSubj: 'short_descriptionInput',
        key: 'short_description',
        changeValue: 'Bug',
        fieldType: 'text' as const,
      },
      {
        dataTestSubj: 'correlation_idInput',
        key: 'correlation_id',
        changeValue: 'Bug',
        fieldType: 'text' as const,
      },
      {
        dataTestSubj: 'correlation_displayInput',
        key: 'correlation_display',
        changeValue: 'Bug',
        fieldType: 'text' as const,
      },
      {
        dataTestSubj: 'descriptionTextArea',
        key: 'description',
        changeValue: 'Bug',
        fieldType: 'text' as const,
      },
      {
        dataTestSubj: 'prioritySelect',
        key: 'priority',
        changeValue: '1',
        fieldType: 'select' as const,
      },
      {
        dataTestSubj: 'categorySelect',
        key: 'category',
        changeValue: 'Denial of Service',
        fieldType: 'select' as const,
      },
      {
        dataTestSubj: 'subcategorySelect',
        key: 'subcategory',
        changeValue: '12',
        fieldType: 'select' as const,
      },
    ];

    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction`, async () => {
        renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);
        act(() => {
          onChoicesSuccess(choicesResponse.choices);
        });
        const theField = screen.getByTestId(field.dataTestSubj);
        if (field.fieldType === 'select') {
          await userEvent.selectOptions(theField, field.changeValue);
          expect(editAction.mock.calls[0][1].incident[field.key]).toEqual(field.changeValue);
        } else {
          await userEvent.tripleClick(theField);
          await userEvent.paste(field.changeValue);
          expect(editAction.mock.calls.at(-1)![1].incident[field.key]).toEqual(field.changeValue);
        }
      })
    );

    test('A comment triggers editAction', async () => {
      renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);
      const commentsTextArea = screen.getByTestId('commentsTextArea');
      await userEvent.tripleClick(commentsTextArea);
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)![1].comments.length).toEqual(1);
    });

    it('updates additional fields', async () => {
      const newValue = JSON.stringify({ bar: 'test' });
      renderWithI18n(<ServiceNowSIRParamsFields {...defaultProps} />);

      await userEvent.click(await screen.findByTestId('additional_fieldsJsonEditor'));
      await userEvent.paste(newValue);

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.additional_fields).toEqual(newValue);
      });
    });
  });
});
