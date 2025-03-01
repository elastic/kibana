/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ParamsFields from './params';
import { OpenAiProviderType, SUB_ACTION } from '../../../common/openai/constants';
import { DEFAULT_URL, getDefaultBody } from './constants';

const messageVariables = [
  {
    name: 'myVar',
    description: 'My variable description',
    useWithTripleBracesInTemplates: true,
  },
];

describe('Gen AI Params Fields renders', () => {
  test('all params fields are rendered', () => {
    render(
      <ParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: { body: '{"message": "test"}' },
        }}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={messageVariables}
      />
    );
    expect(screen.getByTestId('bodyJsonEditor')).toBeInTheDocument();
    expect(screen.getByTestId('bodyJsonEditor')).toHaveProperty('value', '{"message": "test"}');
    expect(screen.getByTestId('bodyAddVariableButton')).toBeInTheDocument();
  });
  test.each([OpenAiProviderType.OpenAi, OpenAiProviderType.AzureAi, OpenAiProviderType.Other])(
    'useEffect handles the case when subAction and subActionParams are undefined and apiProvider is %p',
    (apiProvider) => {
      const actionParams = {
        subAction: undefined,
        subActionParams: undefined,
      };
      const editAction = jest.fn();
      const errors = {};
      const actionConnector = {
        secrets: {
          apiKey: 'apiKey',
        },
        id: 'test',
        actionTypeId: '.gen-ai',
        isPreconfigured: false,
        isSystemAction: false as const,
        isDeprecated: false,
        name: 'My OpenAI Connector',
        config: {
          apiProvider,
          apiUrl: DEFAULT_URL,
        },
      };
      render(
        <ParamsFields
          actionParams={actionParams}
          actionConnector={actionConnector}
          editAction={editAction}
          index={0}
          messageVariables={messageVariables}
          errors={errors}
        />
      );
      expect(editAction).toHaveBeenCalledTimes(2);
      expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
      const body = getDefaultBody(actionConnector.config);
      if (apiProvider === OpenAiProviderType.OpenAi) {
        expect(editAction).toHaveBeenCalledWith('subActionParams', { body }, 0);
      }
      if (apiProvider === OpenAiProviderType.AzureAi) {
        expect(editAction).toHaveBeenCalledWith('subActionParams', { body }, 0);
      }
      if (apiProvider === OpenAiProviderType.Other) {
        expect(editAction).toHaveBeenCalledWith('subActionParams', { body }, 0);
      }
    }
  );

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
      <ParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />
    );
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });

  it('calls editAction function with the correct arguments ', () => {
    const editAction = jest.fn();
    const errors = {};
    render(
      <ParamsFields
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
      />
    );
    const jsonEditor = screen.getByTestId('bodyJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: '{"new_key": "new_value"}' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"new_key": "new_value"}' },
      0
    );
  });
});
