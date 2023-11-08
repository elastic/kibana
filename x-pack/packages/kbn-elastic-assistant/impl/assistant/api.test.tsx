/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';

import {
  deleteKnowledgeBase,
  fetchConnectorExecuteAction,
  FetchConnectorExecuteAction,
  getKnowledgeBaseStatus,
  postEvaluation,
  postKnowledgeBase,
} from './api';
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

describe('API tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchConnectorExecuteAction', () => {
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
          body: '{"params":{"subActionParams":{"model":"gpt-4","messages":[{"role":"user","content":"This is a test"}],"n":1,"stop":null,"temperature":0.2},"subAction":"invokeAI"},"assistantLangChain":true}',
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

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"params":{"subActionParams":{"model":"gpt-4","messages":[{"role":"user","content":"This is a test"}],"n":1,"stop":null,"temperature":0.2},"subAction":"invokeAI"},"assistantLangChain":false}',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: undefined,
        }
      );
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

      expect(result).toEqual({ response: API_ERROR, isStream: false, isError: true });
    });

    it('returns API_ERROR when there are no choices', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValue({ status: 'ok', data: '' });
      const testProps: FetchConnectorExecuteAction = {
        assistantLangChain: false,
        http: mockHttp,
        messages,
        apiConfig,
      };

      const result = await fetchConnectorExecuteAction(testProps);

      expect(result).toEqual({ response: API_ERROR, isStream: false, isError: true });
    });

    it('returns the value of the action_input property when assistantLangChain is true, and `content` has properly prefixed and suffixed JSON with the action_input property', async () => {
      const response = '```json\n{"action_input": "value from action_input"}\n```';

      (mockHttp.fetch as jest.Mock).mockResolvedValue({
        status: 'ok',
        data: response,
      });

      const testProps: FetchConnectorExecuteAction = {
        assistantLangChain: true, // <-- requires response parsing
        http: mockHttp,
        messages,
        apiConfig,
      };

      const result = await fetchConnectorExecuteAction(testProps);

      expect(result).toEqual({
        response: 'value from action_input',
        isStream: false,
        isError: false,
      });
    });

    it('returns the original content when assistantLangChain is true, and `content` has properly formatted JSON WITHOUT the action_input property', async () => {
      const response = '```json\n{"some_key": "some value"}\n```';

      (mockHttp.fetch as jest.Mock).mockResolvedValue({
        status: 'ok',
        data: response,
      });

      const testProps: FetchConnectorExecuteAction = {
        assistantLangChain: true, // <-- requires response parsing
        http: mockHttp,
        messages,
        apiConfig,
      };

      const result = await fetchConnectorExecuteAction(testProps);

      expect(result).toEqual({ response, isStream: false, isError: false });
    });

    it('returns the original when assistantLangChain is true, and `content` is not JSON', async () => {
      const response = 'plain text content';

      (mockHttp.fetch as jest.Mock).mockResolvedValue({
        status: 'ok',
        data: response,
      });

      const testProps: FetchConnectorExecuteAction = {
        assistantLangChain: true, // <-- requires response parsing
        http: mockHttp,
        messages,
        apiConfig,
      };

      const result = await fetchConnectorExecuteAction(testProps);

      expect(result).toEqual({ response, isStream: false, isError: false });
    });
  });

  describe('getKnowledgeBaseStatus', () => {
    it('calls the knowledge base API when correct resource path', async () => {
      const testProps = {
        resource: 'a-resource',
        http: mockHttp,
      };

      await getKnowledgeBaseStatus(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/a-resource',
        {
          method: 'GET',
          signal: undefined,
        }
      );
    });
    it('returns error when error is an error', async () => {
      const testProps = {
        resource: 'a-resource',
        http: mockHttp,
      };
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(getKnowledgeBaseStatus(testProps)).resolves.toThrowError('simulated error');
    });
  });

  describe('postKnowledgeBase', () => {
    it('calls the knowledge base API when correct resource path', async () => {
      const testProps = {
        resource: 'a-resource',
        http: mockHttp,
      };

      await postKnowledgeBase(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/a-resource',
        {
          method: 'POST',
          signal: undefined,
        }
      );
    });
    it('returns error when error is an error', async () => {
      const testProps = {
        resource: 'a-resource',
        http: mockHttp,
      };
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(postKnowledgeBase(testProps)).resolves.toThrowError('simulated error');
    });
  });

  describe('deleteKnowledgeBase', () => {
    it('calls the knowledge base API when correct resource path', async () => {
      const testProps = {
        resource: 'a-resource',
        http: mockHttp,
      };

      await deleteKnowledgeBase(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/a-resource',
        {
          method: 'DELETE',
          signal: undefined,
        }
      );
    });
    it('returns error when error is an error', async () => {
      const testProps = {
        resource: 'a-resource',
        http: mockHttp,
      };
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(deleteKnowledgeBase(testProps)).resolves.toThrowError('simulated error');
    });
  });

  describe('postEvaluation', () => {
    it('calls the knowledge base API when correct resource path', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValue({ success: true });
      const testProps = {
        http: mockHttp,
        evalParams: {
          agents: ['not', 'alphabetical'],
          dataset: '{}',
          evalModel: ['not', 'alphabetical'],
          evalPrompt: 'evalPrompt',
          evaluationType: ['not', 'alphabetical'],
          models: ['not', 'alphabetical'],
          outputIndex: 'outputIndex',
        },
      };

      await postEvaluation(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith('/internal/elastic_assistant/evaluate', {
        method: 'POST',
        body: '{"dataset":{},"evalPrompt":"evalPrompt"}',
        headers: { 'Content-Type': 'application/json' },
        query: {
          models: 'alphabetical,not',
          agents: 'alphabetical,not',
          evaluationType: 'alphabetical,not',
          evalModel: 'alphabetical,not',
          outputIndex: 'outputIndex',
        },
        signal: undefined,
      });
    });
    it('returns error when error is an error', async () => {
      const testProps = {
        resource: 'a-resource',
        http: mockHttp,
      };
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(postEvaluation(testProps)).resolves.toThrowError('simulated error');
    });
  });
});
