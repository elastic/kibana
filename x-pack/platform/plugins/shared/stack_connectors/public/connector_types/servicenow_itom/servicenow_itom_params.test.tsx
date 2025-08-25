/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useChoices } from '../lib/servicenow/use_choices';
import ServiceNowITOMParamsFields from './servicenow_itom_params';

jest.mock('../lib/servicenow/use_choices');
// Mock CodeEditor to strip unsupported DOM props (like languageId) to avoid React unknown prop warnings
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, onChange, ['data-test-subj']: dataTestSubj }: any) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label="code editor"
    />
  ),
}));
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: {}, notifications: { toasts: { addDanger: jest.fn() } } },
  }),
}));

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

const connector: ActionConnector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isSystemAction: false as const,
  isDeprecated: false,
};

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

describe('ServiceNowITOMParamsFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChoicesMock.mockReturnValue(choicesResponse);
  });

  test('renders all param inputs', async () => {
    render(<ServiceNowITOMParamsFields {...defaultProps} />);

    expect(await screen.findByTestId('sourceInput')).toBeInTheDocument();
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

  test('severity invalid state', () => {
    render(<ServiceNowITOMParamsFields {...defaultProps} errors={{ severity: ['error'] }} />);
    const select = screen.getByTestId('severitySelect');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  test('initializes default subActionParams when missing', () => {
    const { subActionParams, ...rest } = actionParams;
    render(<ServiceNowITOMParamsFields {...defaultProps} actionParams={{ ...rest }} />);
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

  test('initializes default subAction when missing', () => {
    const { subAction, ...rest } = actionParams;
    render(<ServiceNowITOMParamsFields {...defaultProps} actionParams={{ ...rest }} />);

    expect(editAction.mock.calls[0][1]).toEqual('addEvent');
  });

  test('resets fields when connector changes', () => {
    const { rerender } = render(<ServiceNowITOMParamsFields {...defaultProps} />);
    expect(editAction).not.toHaveBeenCalled();
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

  test('maps severity choices to options', () => {
    render(<ServiceNowITOMParamsFields {...defaultProps} />);
    const select = screen.getByTestId('severitySelect') as HTMLSelectElement;
    const optionPairs = Array.from(select.options).map((o) => ({ value: o.value, text: o.text }));
    expect(optionPairs).toEqual([
      { value: '1', text: '1 - Critical' },
      { value: '2', text: '2 - Major' },
    ]);
  });

  describe('UI updates', () => {
    const cases: Array<{ testId: string; key: string; value: string }> = [
      { testId: 'sourceInput', key: 'source', value: 'New Source' },      { testId: 'descriptionTextArea', key: 'description', value: 'Some description' },
      { testId: 'nodeInput', key: 'node', value: 'new.node' },
      { testId: 'typeInput', key: 'type', value: 'New Type' },
      { testId: 'resourceInput', key: 'resource', value: '/tmp' },
      { testId: 'metric_nameInput', key: 'metric_name', value: 'CPU' },
      { testId: 'event_classInput', key: 'event_class', value: 'New Class' },
      { testId: 'message_keyInput', key: 'message_key', value: 'mk' },
    ];

    test.each(cases)('updates %s', async ({ testId, key, value }) => {
      editAction.mockClear();
      render(<ServiceNowITOMParamsFields {...defaultProps} />);
      const input = await screen.findByTestId(testId);
      fireEvent.change(input, { target: { value } });
      expect(editAction.mock.calls[0][1][key]).toBe(value);
    });

    test('updates additional_info JSON via edit callback', () => {
      editAction.mockClear();
      render(<ServiceNowITOMParamsFields {...defaultProps} />);

      const newJson = '{"foo":"bar"}';
      fireEvent.change(screen.getByTestId('additional_infoJsonEditor'), {
        target: { value: newJson },
      });

      expect(editAction.mock.calls[0][1].additional_info).toBe(newJson);
    });
  });
});
