/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import ParamsFields from './params';
import { SUB_ACTION } from '../../../common/inference/constants';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';

const mockedIsInferenceEndpointExists = isInferenceEndpointExists as jest.Mock;

jest.mock('@kbn/inference-endpoint-ui-common', () => ({
  isInferenceEndpointExists: jest.fn(),
}));

describe('Inference Params Fields renders', () => {
  mockedIsInferenceEndpointExists.mockResolvedValue(true);
  test('all params fields are rendered', () => {
    const { getByTestId } = render(
      <ParamsFields
        actionParams={{
          subAction: SUB_ACTION.UNIFIED_COMPLETION,
          subActionParams: { body: { messages: [{ role: 'user', content: 'What is Elastic?' }] } },
        }}
        actionConnector={{
          actionTypeId: '.inference',
          config: {
            taskType: 'chat_completion',
          },
          id: 'test',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          secrets: {},
          name: 'AI Connector',
        }}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(getByTestId('inference-bodyJsonEditor')).toBeInTheDocument();
    expect(getByTestId('bodyJsonEditor')).toHaveProperty(
      'value',
      `{\"messages\":[{\"role\":\"user\",\"content\":\"What is Elastic?\"}]}`
    );
  });

  test.each(['openai', 'googleaistudio'])(
    'useEffect handles the case when subAction and subActionParams are undefined and provider is %p',
    (provider) => {
      const actionParams = {
        subAction: undefined,
        subActionParams: undefined,
      };
      const editAction = jest.fn();
      const errors = {};
      const actionConnector = {
        secrets: {
          providerSecrets: { apiKey: 'apiKey' },
        },
        id: 'test',
        actionTypeId: '.inference',
        isPreconfigured: false,
        isSystemAction: false as const,
        isDeprecated: false,
        name: 'My OpenAI Connector',
        config: {
          provider,
          providerConfig: {
            url: 'https://api.openai.com/v1/embeddings',
          },
          taskType: 'completion',
        },
      };
      render(
        <ParamsFields
          actionParams={actionParams}
          actionConnector={actionConnector}
          editAction={editAction}
          index={0}
          errors={errors}
        />
      );
      expect(editAction).toHaveBeenCalledTimes(2);
      if (provider === 'openai') {
        expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.COMPLETION, 0);
        expect(editAction).toHaveBeenCalledWith(
          'subActionParams',
          { input: 'What is Elastic?' },
          0
        );
      }
      if (provider === 'googleaistudio') {
        expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.COMPLETION, 0);
        expect(editAction).toHaveBeenCalledWith(
          'subActionParams',
          { input: 'What is Elastic?' },
          0
        );
      }
    }
  );

  it('handles the case when subAction only is undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: {
        input: '{"key": "value"}',
      },
    };
    const editAction = jest.fn();
    const errors = {};
    render(
      <ParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        errors={errors}
        actionConnector={{
          actionTypeId: '.inference',
          config: {
            taskType: 'completion',
          },
          id: 'test',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          secrets: {},
          name: 'AI Connector',
        }}
      />
    );
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.COMPLETION, 0);
  });

  it('calls editAction function with the correct arguments ', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <ParamsFields
        actionParams={{
          subAction: SUB_ACTION.RERANK,
          subActionParams: {
            input: ['apple', 'banana', 'cherry'],
            query: 'test',
          },
        }}
        editAction={editAction}
        index={0}
        errors={errors}
        actionConnector={{
          actionTypeId: '.inference',
          config: {
            taskType: 'rerank',
          },
          id: 'test',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          secrets: {},
          name: 'AI Connector',
        }}
      />
    );
    const jsonEditor = getByTestId('inputJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: `[\"apple\",\"banana\",\"tomato\"]` } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { input: '["apple","banana","tomato"]', query: 'test' },
      0
    );
  });
});
