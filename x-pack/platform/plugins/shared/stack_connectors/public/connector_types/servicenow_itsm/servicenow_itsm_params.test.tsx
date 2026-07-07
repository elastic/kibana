/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, screen } from '@testing-library/react';
import { merge } from 'lodash';

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useGetChoices } from '../lib/servicenow/use_get_choices';
import ServiceNowITSMParamsFields from './servicenow_itsm_params';
import type { Choice } from '../lib/servicenow/types';
import { ACTION_GROUP_RECOVERED } from '../lib/servicenow/helpers';
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
      severity: '1',
      urgency: '2',
      impact: '3',
      category: 'software',
      subcategory: 'os',
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
  selectedActionGroupId: 'trigger',
  executionMode: ActionConnectorMode.ActionForm,
};

const useGetChoicesResponse = {
  isLoading: false,
  choices: [
    {
      dependent_value: '',
      label: 'Software',
      value: 'software',
      element: 'category',
    },
    {
      dependent_value: 'software',
      label: 'Operation System',
      value: 'os',
      element: 'subcategory',
    },
    {
      dependent_value: '',
      label: 'Failed Login',
      value: 'failed_login',
      element: 'category',
    },
    ...['severity', 'urgency', 'impact']
      .map((element) => [
        {
          dependent_value: '',
          label: '1 - Critical',
          value: '1',
          element,
        },
        {
          dependent_value: '',
          label: '2 - High',
          value: '2',
          element,
        },
        {
          dependent_value: '',
          label: '3 - Moderate',
          value: '3',
          element,
        },
        {
          dependent_value: '',
          label: '4 - Low',
          value: '4',
          element,
        },
      ])
      .flat(),
  ],
};

describe('ServiceNowITSMParamsFields renders', () => {
  let onChoices = (choices: Choice[]) => {};

  beforeEach(() => {
    jest.clearAllMocks();
    useGetChoicesMock.mockImplementation((args) => {
      onChoices = args.onSuccess;
      return useGetChoicesResponse;
    });
  });

  test('all params fields is rendered', () => {
    renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });
    expect(screen.queryByTestId('eventActionSelect')).not.toBeInTheDocument();
    expect(screen.getByTestId('urgencySelect')).toBeInTheDocument();
    expect(screen.getByTestId('severitySelect')).toBeInTheDocument();
    expect(screen.getByTestId('impactSelect')).toBeInTheDocument();
    expect(screen.getByTestId('categorySelect')).toBeInTheDocument();
    expect(screen.getByTestId('subcategorySelect')).toBeInTheDocument();
    expect(screen.getByTestId('short_descriptionInput')).toBeInTheDocument();
    expect(screen.getByTestId('correlation_idInput')).toBeInTheDocument();
    expect(screen.getByTestId('correlation_displayInput')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();
  });

  test('If short_description has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.short_description': ['error'] },
    };
    renderWithI18n(<ServiceNowITSMParamsFields {...newProps} />);
    expect(screen.getByTestId('short_descriptionInput')).toHaveAttribute('aria-invalid', 'true');
  });

  test('Resets fields when connector changes', () => {
    const { rerender } = renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    rerender(
      <I18nProvider>
        <ServiceNowITSMParamsFields
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

  test('Resets fields when connector changes and action group is recovered', () => {
    const newProps = {
      ...defaultProps,
      selectedActionGroupId: ACTION_GROUP_RECOVERED,
    };
    const { rerender } = renderWithI18n(<ServiceNowITSMParamsFields {...newProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    rerender(
      <I18nProvider>
        <ServiceNowITSMParamsFields {...newProps} actionConnector={{ ...connector, id: '1234' }} />
      </I18nProvider>
    );
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: { correlation_id: '{{rule.id}}:{{alert.id}}' },
    });
  });

  test('it transforms the categories to options correctly', async () => {
    renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    const select = screen.getByTestId('categorySelect') as HTMLSelectElement;
    const options = Array.from(select.options)
      .filter((opt) => opt.value !== '')
      .map((opt) => ({ value: opt.value, text: opt.text }));
    expect(options).toEqual([
      { value: 'software', text: 'Software' },
      { value: 'failed_login', text: 'Failed Login' },
    ]);
  });

  test('it transforms the subcategories to options correctly', async () => {
    renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    const select = screen.getByTestId('subcategorySelect') as HTMLSelectElement;
    const options = Array.from(select.options)
      .filter((opt) => opt.value !== '')
      .map((opt) => ({ value: opt.value, text: opt.text }));
    expect(options).toEqual([{ value: 'os', text: 'Operation System' }]);
  });

  test('it transforms the options correctly', async () => {
    renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    const testers = ['severity', 'urgency', 'impact'];
    testers.forEach((subj) => {
      const select = screen.getByTestId(`${subj}Select`) as HTMLSelectElement;
      const options = Array.from(select.options)
        .filter((opt) => opt.value !== '')
        .map((opt) => ({ value: opt.value, text: opt.text }));
      expect(options).toEqual([
        { value: '1', text: '1 - Critical' },
        { value: '2', text: '2 - High' },
        { value: '3', text: '3 - Moderate' },
        { value: '4', text: '4 - Low' },
      ]);
    });
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
    renderWithI18n(<ServiceNowITSMParamsFields {...newProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    expect(screen.queryByTestId('subcategorySelect')).not.toBeInTheDocument();
  });

  describe('UI updates', () => {
    test('short_description update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      const input = screen.getByTestId('short_descriptionInput');
      await userEvent.tripleClick(input);
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)![1].incident.short_description).toEqual('Bug');
    });

    test('correlation_id update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      const input = screen.getByTestId('correlation_idInput');
      await userEvent.tripleClick(input);
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)![1].incident.correlation_id).toEqual('Bug');
    });

    test('correlation_display update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      const input = screen.getByTestId('correlation_displayInput');
      await userEvent.tripleClick(input);
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)![1].incident.correlation_display).toEqual('Bug');
    });

    test('description update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      const input = screen.getByTestId('descriptionTextArea');
      await userEvent.tripleClick(input);
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)![1].incident.description).toEqual('Bug');
    });

    test('urgency update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      await userEvent.selectOptions(screen.getByTestId('urgencySelect'), '1');
      expect(editAction.mock.calls[0][1].incident.urgency).toEqual('1');
    });

    test('severity update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      await userEvent.selectOptions(screen.getByTestId('severitySelect'), '2');
      expect(editAction.mock.calls[0][1].incident.severity).toEqual('2');
    });

    test('impact update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      await userEvent.selectOptions(screen.getByTestId('impactSelect'), '1');
      expect(editAction.mock.calls[0][1].incident.impact).toEqual('1');
    });

    test('category update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      await userEvent.selectOptions(screen.getByTestId('categorySelect'), 'failed_login');
      expect(editAction.mock.calls[0][1].incident.category).toEqual('failed_login');
    });

    test('subcategory update triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      act(() => {
        onChoices(useGetChoicesResponse.choices);
      });
      await userEvent.selectOptions(screen.getByTestId('subcategorySelect'), 'os');
      expect(editAction.mock.calls[0][1].incident.subcategory).toEqual('os');
    });

    test('A comment triggers editAction', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);
      const input = screen.getByTestId('commentsTextArea');
      await userEvent.tripleClick(input);
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)![1].comments.length).toEqual(1);
    });

    test('shows only correlation_id field when actionGroup is recovered', () => {
      const newProps = {
        ...defaultProps,
        selectedActionGroupId: 'recovered',
      };
      renderWithI18n(<ServiceNowITSMParamsFields {...newProps} />);
      expect(screen.getByTestId('correlation_idInput')).toBeInTheDocument();
      expect(screen.queryByTestId('short_descriptionInput')).not.toBeInTheDocument();
    });

    test('shows incident details when action group is undefined', () => {
      const newProps = {
        ...defaultProps,
        selectedActionGroupId: undefined,
      };
      renderWithI18n(<ServiceNowITSMParamsFields {...newProps} />);
      expect(screen.getByTestId('short_descriptionInput')).toBeInTheDocument();
      expect(screen.getByTestId('correlation_idInput')).toBeInTheDocument();
    });

    test('A short description change triggers editAction', async () => {
      renderWithI18n(
        <ServiceNowITSMParamsFields
          actionParams={{}}
          errors={{ ['subActionParams.incident.short_description']: [] }}
          editAction={editAction}
          index={0}
          selectedActionGroupId={'trigger'}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      const input = screen.getByTestId('short_descriptionInput');
      await userEvent.tripleClick(input);
      await userEvent.paste('new updated short description');

      expect(editAction.mock.calls.at(-1)![1]).toEqual({
        incident: { short_description: 'new updated short description' },
        comments: [],
      });
    });

    test('A correlation_id field change triggers edit action correctly when actionGroup is recovered', async () => {
      renderWithI18n(
        <ServiceNowITSMParamsFields
          selectedActionGroupId={'recovered'}
          actionParams={{}}
          errors={{ ['subActionParams.incident.short_description']: [] }}
          editAction={editAction}
          index={0}
        />
      );

      const input = screen.getByTestId('correlation_idInput');
      await userEvent.tripleClick(input);
      await userEvent.paste('updated correlation id');

      expect(editAction.mock.calls.at(-1)![1]).toEqual({
        incident: { correlation_id: 'updated correlation id' },
      });
    });

    test('throws error if correlation_id is null and sub action is recovered', () => {
      const newProps = {
        ...defaultProps,
        actionParams: {
          subAction: 'closeIncident',
          subActionParams: {
            incident: {
              ...defaultProps.actionParams.subActionParams.incident,
              correlation_id: null,
            },
            comments: null,
          },
        },
        errors: { 'subActionParams.incident.correlation_id': ['correlation_id_error'] },
        selectedActionGroupId: ACTION_GROUP_RECOVERED,
      };

      renderWithI18n(<ServiceNowITSMParamsFields {...newProps} />);

      expect(screen.getByText('correlation_id_error')).toBeInTheDocument();
    });

    it('updates additional fields', async () => {
      const newValue = JSON.stringify({ bar: 'test' });
      renderWithI18n(<ServiceNowITSMParamsFields {...defaultProps} />);

      await userEvent.click(await screen.findByTestId('additional_fieldsJsonEditor'));
      await userEvent.paste(newValue);

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.additional_fields).toEqual(newValue);
      });
    });
  });

  describe('Test form', () => {
    const newDefaultProps = {
      ...defaultProps,
      executionMode: ActionConnectorMode.Test,
      actionParams: {},
      selectedActionGroupId: undefined,
    };

    test('renders event action dropdown correctly', () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...newDefaultProps} />);
      expect(screen.getByTestId('eventActionSelect')).toBeInTheDocument();
      const select = screen.getByTestId('eventActionSelect') as HTMLSelectElement;
      const options = Array.from(select.options)
        .filter((opt) => opt.value !== '')
        .map((opt) => ({ value: opt.value, text: opt.text }));
      expect(options).toEqual([
        { value: 'trigger', text: 'Trigger' },
        { value: 'resolve', text: 'Resolve' },
      ]);
    });

    test('shows form for trigger action correctly', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...newDefaultProps} />);

      await userEvent.selectOptions(screen.getByTestId('eventActionSelect'), 'trigger');

      expect(editAction.mock.calls[0][1]).toEqual('pushToService');

      expect(screen.getByTestId('urgencySelect')).toBeInTheDocument();
      expect(screen.getByTestId('severitySelect')).toBeInTheDocument();
      expect(screen.getByTestId('impactSelect')).toBeInTheDocument();
      expect(screen.getByTestId('categorySelect')).toBeInTheDocument();
      expect(screen.getByTestId('short_descriptionInput')).toBeInTheDocument();
      expect(screen.getByTestId('correlation_idInput')).toBeInTheDocument();
      expect(screen.getByTestId('correlation_displayInput')).toBeInTheDocument();
      expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
      expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();
    });

    test('shows form for resolve action correctly', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...newDefaultProps} />);

      expect(editAction.mock.calls[0][1]).toEqual('pushToService');

      await userEvent.selectOptions(screen.getByTestId('eventActionSelect'), 'resolve');

      await waitFor(() => {
        expect(editAction.mock.calls[1][1]).toEqual('closeIncident');
      });

      expect(screen.getByTestId('correlation_idInput')).toBeInTheDocument();
      expect(screen.queryByTestId('urgencySelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('severitySelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('impactSelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('categorySelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('subcategorySelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('short_descriptionInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('correlation_displayInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('descriptionTextArea')).not.toBeInTheDocument();
      expect(screen.queryByTestId('commentsTextArea')).not.toBeInTheDocument();
    });

    test('resets form fields on action change', async () => {
      renderWithI18n(<ServiceNowITSMParamsFields {...newDefaultProps} />);

      const correlationInput = screen.getByTestId('correlation_idInput');
      await userEvent.tripleClick(correlationInput);
      await userEvent.paste('updated correlation id');

      // Verify the correlation_id was updated via editAction
      expect(editAction.mock.calls.at(-1)![1]).toEqual({
        incident: { correlation_id: 'updated correlation id' },
      });

      editAction.mockClear();
      await userEvent.selectOptions(screen.getByTestId('eventActionSelect'), 'resolve');

      // After changing to 'resolve', editAction should be called with 'closeIncident'
      // which resets the sub-action and clears the form fields
      await waitFor(() => {
        expect(editAction).toHaveBeenCalledWith('subAction', 'closeIncident', 0);
      });
    });
  });
});
