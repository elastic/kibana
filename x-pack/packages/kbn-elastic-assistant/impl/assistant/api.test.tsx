/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';

import { fetchConnectorExecuteAction, FetchConnectorExecuteAction } from './api';
import type { Conversation, Message } from '../assistant_context/types';
import { API_ERROR } from './translations';

jest.mock('@kbn/core-http-browser');

const mockHttp = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

const apiConfig: Conversation['apiConfig'] = {
  connectorId: 'foo',
  model: 'gpt-4',
  provider: OpenAiProviderType.OpenAi,
};

const messages: Message[] = [
  { content: 'This is a test', role: 'user', timestamp: new Date().toLocaleString() },
];

describe('fetchConnectorExecuteAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the internal assistant API when assistantLangChain is true', async () => {
    const testProps: FetchConnectorExecuteAction = {
      assistantLangChain: true,
      http: mockHttp,
      messages,
      apiConfig,
    };

    await fetchConnectorExecuteAction(testProps);

    expect(mockHttp.fetch).toHaveBeenCalledWith(
      '/internal/elastic_assistant/actions/connector/foo/_execute',
      {
        body: '{"params":{"subActionParams":{"body":"{\\"model\\":\\"gpt-4\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"This is a test\\"}],\\"n\\":1,\\"stop\\":null,\\"temperature\\":0.2}"},"subAction":"test"}}',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: undefined,
      }
    );
  });

  it('calls the actions connector api when assistantLangChain is false', async () => {
    const testProps: FetchConnectorExecuteAction = {
      assistantLangChain: false,
      http: mockHttp,
      messages,
      apiConfig,
    };

    await fetchConnectorExecuteAction(testProps);

    expect(mockHttp.fetch).toHaveBeenCalledWith('/api/actions/connector/foo/_execute', {
      body: '{"params":{"subActionParams":{"body":"{\\"model\\":\\"gpt-4\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"This is a test\\"}],\\"n\\":1,\\"stop\\":null,\\"temperature\\":0.2}"},"subAction":"test"}}',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: undefined,
    });
  });

  it('returns API_ERROR when the response status is not ok', async () => {
    (mockHttp.fetch as jest.Mock).mockResolvedValue({ status: 'error' });

    const testProps: FetchConnectorExecuteAction = {
      assistantLangChain: false,
      http: mockHttp,
      messages,
      apiConfig,
    };

    const result = await fetchConnectorExecuteAction(testProps);

    expect(result).toBe(API_ERROR);
  });

  it('returns API_ERROR when there are no choices', async () => {
    (mockHttp.fetch as jest.Mock).mockResolvedValue({ status: 'ok', data: {} });
    const testProps: FetchConnectorExecuteAction = {
      assistantLangChain: false,
      http: mockHttp,
      messages,
      apiConfig,
    };

    const result = await fetchConnectorExecuteAction(testProps);

    expect(result).toBe(API_ERROR);
  });

  it('return the trimmed first `choices` `message` `content` when the API call is successful', async () => {
    (mockHttp.fetch as jest.Mock).mockResolvedValue({
      status: 'ok',
      data: {
        choices: [
          {
            message: {
              content: '   Test response    ', // leading and trailing whitespace
            },
          },
        ],
      },
    });

    const testProps: FetchConnectorExecuteAction = {
      assistantLangChain: false,
      http: mockHttp,
      messages,
      apiConfig,
    };

    const result = await fetchConnectorExecuteAction(testProps);

    expect(result).toBe('Test response');
  });
});
