/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import BedrockParamsFields from './params';
import { DEFAULT_BEDROCK_URL, SUB_ACTION } from '../../../common/bedrock/constants';
import { I18nProvider } from '@kbn/i18n-react';
import { DEFAULT_BODY } from './constants';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

const messageVariables = [
  {
    name: 'myVar',
    description: 'My variable description',
    useWithTripleBracesInTemplates: true,
  },
];

describe('Bedrock Params Fields renders', () => {
  test('all params fields are rendered', () => {
    const actionConnector = createMockActionConnector({
      secrets: {
        accessKey: 'accessKey',
        secret: 'secret',
      },
      id: 'test',
      actionTypeId: '.bedrock',
      isPreconfigured: false,
      isSystemAction: false as const,
      isDeprecated: false,
      name: 'My Bedrock Connector',
      config: {
        apiUrl: DEFAULT_BEDROCK_URL,
      },
    });
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: { body: '{"message": "test"}' },
        }}
        actionConnector={actionConnector}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={messageVariables}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();
    expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', '{"message": "test"}');
    expect(getByTestId('bodyAddVariableButton')).toBeInTheDocument();
    expect(getByTestId('bedrock-model')).toBeInTheDocument();
  });
  test('useEffect handles the case when subAction and subActionParams are undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: undefined,
    };
    const editAction = jest.fn();
    const errors = {};
    const actionConnector = createMockActionConnector({
      secrets: {
        accessKey: 'accessKey',
        secret: 'secret',
      },
      id: 'test',
      actionTypeId: '.bedrock',
      name: 'My Bedrock Connector',
      config: {
        apiUrl: DEFAULT_BEDROCK_URL,
      },
    });

    render(
      <BedrockParamsFields
        actionParams={actionParams}
        actionConnector={actionConnector}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(editAction).toHaveBeenCalledTimes(2);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });

  it('handles the case when subAction only is undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: {
        body: '{"key": "value"}',
      },
    };
    const editAction = jest.fn();
    const errors = {};

    render(
      <BedrockParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });

  it('calls editAction function with the body argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const jsonEditor = getByTestId('bodyJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: '{"new_key": "new_value"}' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"new_key": "new_value"}' },
      0
    );
  });

  it('removes trailing spaces from the body argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const jsonEditor = getByTestId('bodyJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: '{"new_key": "new_value"} ' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"new_key": "new_value"}' },
      0
    );
  });

  it('calls editAction function with the model argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const model = getByTestId('bedrock-model');
    fireEvent.change(model, { target: { value: 'not-the-default' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"key": "value"}', model: 'not-the-default' },
      0
    );
  });

  it('handles extended thinking and budget tokens when actionConnector has extendedThinking true => false', () => {
    const editAction = jest.fn();
    const errors = {};
    const actionConnector = createMockActionConnector({
      secrets: {
        accessKey: 'accessKey',
        secret: 'secret',
      },
      id: 'test',
      actionTypeId: '.bedrock',
      isPreconfigured: false,
      isSystemAction: false as const,
      isDeprecated: false,
      name: 'My Bedrock Connector',
      config: {
        apiUrl: DEFAULT_BEDROCK_URL,
        extendedThinking: true,
        budgetTokens: 2048,
      },
    });
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: DEFAULT_BODY,
          },
        }}
        actionConnector={actionConnector}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const extendedThinkingSwitch = getByTestId('bedrock-extended-thinking');
    fireEvent.click(extendedThinkingSwitch);
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        body: DEFAULT_BODY,
      },
      0
    );

    // Parse and verify the body contains DEFAULT_BODY fields but NOT thinking config
    const bodyArg = JSON.parse(editAction.mock.calls[0][1].body);
    expect(bodyArg).toMatchObject({
      anthropic_version: 'bedrock-2023-05-31',
      messages: expect.any(Array),
      max_tokens: expect.any(Number),
      stop_sequences: expect.any(Array),
    });
    expect(bodyArg).not.toHaveProperty('thinking');
  });

  it('handles extended thinking and budget tokens when actionConnector has extendedThinking false => true', () => {
    const editAction = jest.fn();
    const errors = {};
    const actionConnector = createMockActionConnector({
      secrets: {
        accessKey: 'accessKey',
        secret: 'secret',
      },
      id: 'test',
      actionTypeId: '.bedrock',
      isPreconfigured: false,
      isSystemAction: false as const,
      isDeprecated: false,
      name: 'My Bedrock Connector',
      config: {
        apiUrl: DEFAULT_BEDROCK_URL,
      },
    });
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: DEFAULT_BODY,
          },
        }}
        actionConnector={actionConnector}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );

    const extendedThinkingSwitch = getByTestId('bedrock-extended-thinking');
    fireEvent.click(extendedThinkingSwitch);
    // Verify editAction was called with the correct structure
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        body: JSON.stringify({
          ...JSON.parse(DEFAULT_BODY),
          thinking: {
            type: 'enabled',
            budget_tokens: 1024,
          },
        }),
      },
      0
    );

    // Parse and verify the body contains DEFAULT_BODY fields but NOT thinking config
    const bodyArg = JSON.parse(editAction.mock.calls[0][1].body);
    expect(bodyArg).toMatchObject({
      anthropic_version: 'bedrock-2023-05-31',
      messages: expect.any(Array),
      max_tokens: expect.any(Number),
      stop_sequences: expect.any(Array),
      thinking: {
        budget_tokens: expect.any(Number),
      },
    });
    expect(bodyArg).toHaveProperty('thinking');
  });
});
