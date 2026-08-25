/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useChoices } from '../lib/servicenow/use_choices';
import ServiceNowITOMParamsFields from './servicenow_itom_params';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

jest.mock('../lib/servicenow/use_choices');
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const useChoicesMock = useChoices as jest.Mock;

const actionParams = {
  subAction: 'addEvent',
  subActionParams: {
    source: 'A source',
    event_class: 'An event class',
    resource: 'C:',
    node: 'node.example.com',
    metric_name: 'Percentage Logical Disk Free Space',
    type: 'Disk space',
    severity: '4',
    description: 'desc',
    additional_info: '{"alert": "test"}',
    message_key: 'a key',
    time_of_event: '2021-10-13T10:51:44.981Z',
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
  choices: {
    severity: [
      {
        dependent_value: '',
        label: '1 - Critical',
        value: '1',
        element: 'severity',
      },
      {
        dependent_value: '',
        label: '2 - Major',
        value: '2',
        element: 'severity',
      },
    ],
  },
};

describe('ServiceNowITOMParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChoicesMock.mockImplementation(() => {
      return choicesResponse;
    });
  });

  test('all params fields is rendered', () => {
    render(<ServiceNowITOMParamsFields {...defaultProps} />);
    expect(screen.getByTestId('sourceInput')).toBeInTheDocument();
    expect(screen.getByTestId('nodeInput')).toBeInTheDocument();
    expect(screen.getByTestId('typeInput')).toBeInTheDocument();
    expect(screen.getByTestId('resourceInput')).toBeInTheDocument();
    expect(screen.getByTestId('metric_nameInput')).toBeInTheDocument();
    expect(screen.getByTestId('event_classInput')).toBeInTheDocument();
    expect(screen.getByTestId('message_keyInput')).toBeInTheDocument();
    expect(screen.getByTestId('severitySelect')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('additional_infoJsonEditor')).toBeInTheDocument();
  });

  test('If severity has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { severity: ['error'] },
    };
    render(<ServiceNowITOMParamsFields {...newProps} />);
    expect(screen.getByTestId('severitySelect')).toHaveAttribute('aria-invalid', 'true');
  });

  test('When subActionParams is undefined, set to default', () => {
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };

    render(<ServiceNowITOMParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      message_key: '{{rule.id}}:{{alert.id}}',
      additional_info: JSON.stringify(
        {
          alert: {
            id: '{{alert.id}}',
            actionGroup: '{{alert.actionGroup}}',
            actionSubgroup: '{{alert.actionSubgroup}}',
            actionGroupName: '{{alert.actionGroupName}}',
          },
          rule: {
            id: '{{rule.id}}',
            name: '{{rule.name}}',
            type: '{{rule.type}}',
          },
          date: '{{date}}',
        },
        null,
        4
      ),
    });
  });

  test('When subAction is undefined, set to default', () => {
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    render(<ServiceNowITOMParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('addEvent');
  });

  test('Resets fields when connector changes', () => {
    const { rerender } = render(<ServiceNowITOMParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    rerender(
      <ServiceNowITOMParamsFields
        {...defaultProps}
        actionConnector={{ ...connector, id: '1234' }}
      />
    );
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      message_key: '{{rule.id}}:{{alert.id}}',
      additional_info: JSON.stringify(
        {
          alert: {
            id: '{{alert.id}}',
            actionGroup: '{{alert.actionGroup}}',
            actionSubgroup: '{{alert.actionSubgroup}}',
            actionGroupName: '{{alert.actionGroupName}}',
          },
          rule: {
            id: '{{rule.id}}',
            name: '{{rule.name}}',
            type: '{{rule.type}}',
          },
          date: '{{date}}',
        },
        null,
        4
      ),
    });
  });

  test('it transforms the categories to options correctly', async () => {
    render(<ServiceNowITOMParamsFields {...defaultProps} />);
    const select = screen.getByTestId('severitySelect') as HTMLSelectElement;
    const options = Array.from(select.options)
      .filter((opt) => opt.value !== '')
      .map((opt) => ({ value: opt.value, text: opt.text }));
    expect(options).toEqual([
      { value: '1', text: '1 - Critical' },
      { value: '2', text: '2 - Major' },
    ]);
  });

  describe('UI updates', () => {
    test('source update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('sourceInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].source).toEqual('Bug');
    });

    test('description update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('descriptionTextArea'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].description).toEqual('Bug');
    });

    test('node update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('nodeInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].node).toEqual('Bug');
    });

    test('type update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('typeInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].type).toEqual('Bug');
    });

    test('resource update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('resourceInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].resource).toEqual('Bug');
    });

    test('metric_name update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('metric_nameInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].metric_name).toEqual('Bug');
    });

    test('event_class update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('event_classInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].event_class).toEqual('Bug');
    });

    test('message_key update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('message_keyInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].message_key).toEqual('Bug');
    });

    test('severity update triggers editAction', async () => {
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.selectOptions(screen.getByTestId('severitySelect'), '1');
      expect(editAction.mock.calls.at(-1)[1].severity).toEqual('1');
    });

    test('additional_info update triggers editAction correctly', async () => {
      const newValue = '{"foo": "bar"}';
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('additional_infoJsonEditor'));
      await userEvent.paste(newValue);
      expect(editAction.mock.calls.at(-1)[1].additional_info).toEqual(newValue);
    });
  });
});
