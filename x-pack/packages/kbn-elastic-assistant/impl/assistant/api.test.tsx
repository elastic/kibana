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
const fetchConnectorArgs: FetchConnectorExecuteAction = {
  alerts: false,
  apiConfig,
  assistantLangChain: true,
  assistantStreamingEnabled: true,
  http: mockHttp,
  messages,
  onNewReplacements: jest.fn(),
  ragOnAlerts: false,
};
describe('API tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchConnectorExecuteAction', () => {
    it('calls the internal assistant API when assistantLangChain is true', async () => {
      await fetchConnectorExecuteAction(fetchConnectorArgs);

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

    it('calls the actions connector api with streaming when assistantStreamingEnabled is true when assistantLangChain is false', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        assistantLangChain: false,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"params":{"subActionParams":{"model":"gpt-4","messages":[{"role":"user","content":"This is a test"}],"n":1,"stop":null,"temperature":0.2},"subAction":"invokeStream"},"assistantLangChain":false}',
          method: 'POST',
          asResponse: true,
          rawResponse: true,
          signal: undefined,
        }
      );
    });

    it('calls the actions connector with the expected optional request parameters', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        alerts: true,
        alertsIndexPattern: '.alerts-security.alerts-default',
        allow: ['a', 'b', 'c'],
        allowReplacement: ['b', 'c'],
        ragOnAlerts: true,
        replacements: { auuid: 'real.hostname' },
        size: 30,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"params":{"subActionParams":{"model":"gpt-4","messages":[{"role":"user","content":"This is a test"}],"n":1,"stop":null,"temperature":0.2},"subAction":"invokeAI"},"assistantLangChain":true,"alertsIndexPattern":".alerts-security.alerts-default","allow":["a","b","c"],"allowReplacement":["b","c"],"replacements":{"auuid":"real.hostname"},"size":30}',
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          signal: undefined,
        }
      );
    });

    it('calls the actions connector api with invoke when assistantStreamingEnabled is false when assistantLangChain is false', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        assistantLangChain: false,
        assistantStreamingEnabled: false,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"params":{"subActionParams":{"model":"gpt-4","messages":[{"role":"user","content":"This is a test"}],"n":1,"stop":null,"temperature":0.2},"subAction":"invokeAI"},"assistantLangChain":false}',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: undefined,
        }
      );
    });

    it('calls the actions connector api with invoke when assistantStreamingEnabled is true when assistantLangChain is false and alerts is true', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        assistantLangChain: false,
        alerts: true,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"params":{"subActionParams":{"model":"gpt-4","messages":[{"role":"user","content":"This is a test"}],"n":1,"stop":null,"temperature":0.2},"subAction":"invokeAI"},"assistantLangChain":false}',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: undefined,
        }
      );
    });

    it('returns API_ERROR when the response status is error and langchain is on', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValue({ status: 'error' });

      const result = await fetchConnectorExecuteAction(fetchConnectorArgs);

      expect(result).toEqual({ response: API_ERROR, isStream: false, isError: true });
    });

    it('returns API_ERROR + error message on non streaming responses', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValue({
        status: 'error',
        service_message: 'an error message',
      });
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        assistantLangChain: false,
        assistantStreamingEnabled: false,
      };

      const result = await fetchConnectorExecuteAction(testProps);

      expect(result).toEqual({
        response: `${API_ERROR}\n\nan error message`,
        isStream: false,
        isError: true,
      });
    });

    it('returns API_ERROR when the response status is error, langchain is off, and response is not a reader', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValue({ status: 'error' });

      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        assistantLangChain: false,
      };

      const result = await fetchConnectorExecuteAction(testProps);

      expect(result).toEqual({
        response: `${API_ERROR}\n\nCould not get reader from response`,
        isStream: false,
        isError: true,
      });
    });

    it('returns API_ERROR when the response is error, langchain is off, and response is a reader', async () => {
      const mockReader = jest.fn();
      (mockHttp.fetch as jest.Mock).mockRejectedValue({
        response: { body: { getReader: jest.fn().mockImplementation(() => mockReader) } },
      });
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        assistantLangChain: false,
      };

      const result = await fetchConnectorExecuteAction(testProps);

      expect(result).toEqual({
        response: mockReader,
        isStream: true,
        isError: true,
      });
    });

    it('returns API_ERROR when there are no choices', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValue({ status: 'ok', data: '' });

      const result = await fetchConnectorExecuteAction(fetchConnectorArgs);

      expect(result).toEqual({ response: API_ERROR, isStream: false, isError: true });
    });

    it('returns the value of the action_input property when assistantLangChain is true, and `content` has properly prefixed and suffixed JSON with the action_input property', async () => {
      const response = '```json\n{"action_input": "value from action_input"}\n```';

      (mockHttp.fetch as jest.Mock).mockResolvedValue({
        status: 'ok',
        data: response,
      });

      const result = await fetchConnectorExecuteAction(fetchConnectorArgs);

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

      const result = await fetchConnectorExecuteAction(fetchConnectorArgs);

      expect(result).toEqual({ response, isStream: false, isError: false });
    });

    it('returns the original when assistantLangChain is true, and `content` is not JSON', async () => {
      const response = 'plain text content';

      (mockHttp.fetch as jest.Mock).mockResolvedValue({
        status: 'ok',
        data: response,
      });

      const result = await fetchConnectorExecuteAction(fetchConnectorArgs);

      expect(result).toEqual({ response, isStream: false, isError: false });
    });
  });

  const knowledgeBaseArgs = {
    resource: 'a-resource',
    http: mockHttp,
  };
  describe('getKnowledgeBaseStatus', () => {
    it('calls the knowledge base API when correct resource path', async () => {
      await getKnowledgeBaseStatus(knowledgeBaseArgs);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/a-resource',
        {
          method: 'GET',
          signal: undefined,
        }
      );
    });
    it('returns error when error is an error', async () => {
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(getKnowledgeBaseStatus(knowledgeBaseArgs)).resolves.toThrowError(
        'simulated error'
      );
    });
  });

  describe('postKnowledgeBase', () => {
    it('calls the knowledge base API when correct resource path', async () => {
      await postKnowledgeBase(knowledgeBaseArgs);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/a-resource',
        {
          method: 'POST',
          signal: undefined,
        }
      );
    });
    it('returns error when error is an error', async () => {
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(postKnowledgeBase(knowledgeBaseArgs)).resolves.toThrowError('simulated error');
    });
  });

  describe('deleteKnowledgeBase', () => {
    it('calls the knowledge base API when correct resource path', async () => {
      await deleteKnowledgeBase(knowledgeBaseArgs);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/a-resource',
        {
          method: 'DELETE',
          signal: undefined,
        }
      );
    });
    it('returns error when error is an error', async () => {
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(deleteKnowledgeBase(knowledgeBaseArgs)).resolves.toThrowError('simulated error');
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
          datasetName: 'Test Dataset',
          projectName: 'Test Project Name',
          runName: 'Test Run Name',
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
          datasetName: 'Test Dataset',
          evaluationType: 'alphabetical,not',
          evalModel: 'alphabetical,not',
          outputIndex: 'outputIndex',
          projectName: 'Test Project Name',
          runName: 'Test Run Name',
        },
        signal: undefined,
      });
    });
    it('returns error when error is an error', async () => {
      const error = 'simulated error';
      (mockHttp.fetch as jest.Mock).mockImplementation(() => {
        throw new Error(error);
      });

      await expect(postEvaluation(knowledgeBaseArgs)).resolves.toThrowError('simulated error');
    });
  });
});
