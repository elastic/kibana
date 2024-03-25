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
  postKnowledgeBase,
} from '.';
import type { Conversation } from '../../assistant_context/types';
import { API_ERROR } from '../translations';

jest.mock('@kbn/core-http-browser');

const mockHttp = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

const apiConfig: Conversation['apiConfig'] = {
  connectorId: 'foo',
  model: 'gpt-4',
  provider: OpenAiProviderType.OpenAi,
};

const fetchConnectorArgs: FetchConnectorExecuteAction = {
  isEnabledRAGAlerts: false,
  apiConfig,
  isEnabledKnowledgeBase: true,
  assistantStreamingEnabled: true,
  http: mockHttp,
  message: 'This is a test',
  conversationId: 'test',
  replacements: [],
};
describe('API tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchConnectorExecuteAction', () => {
    it('calls the internal assistant API when isEnabledKnowledgeBase is true', async () => {
      await fetchConnectorExecuteAction(fetchConnectorArgs);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"model":"gpt-4","message":"This is a test","subAction":"invokeAI","conversationId":"test","replacements":[],"isEnabledKnowledgeBase":true,"isEnabledRAGAlerts":false}',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: undefined,
          version: '1',
        }
      );
    });

    it('calls the actions connector api with streaming when assistantStreamingEnabled is true when isEnabledKnowledgeBase is false', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        isEnabledKnowledgeBase: false,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"model":"gpt-4","message":"This is a test","subAction":"invokeStream","conversationId":"test","replacements":[],"isEnabledKnowledgeBase":false,"isEnabledRAGAlerts":false}',
          method: 'POST',
          asResponse: true,
          rawResponse: true,
          signal: undefined,
          version: '1',
        }
      );
    });

    it('calls the actions connector with the expected optional request parameters', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        isEnabledRAGAlerts: true,
        alertsIndexPattern: '.alerts-security.alerts-default',
        allow: ['a', 'b', 'c'],
        allowReplacement: ['b', 'c'],
        replacements: [{ uuid: 'auuid', value: 'real.hostname' }],
        size: 30,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"model":"gpt-4","message":"This is a test","subAction":"invokeAI","conversationId":"test","replacements":[{"uuid":"auuid","value":"real.hostname"}],"isEnabledKnowledgeBase":true,"isEnabledRAGAlerts":true,"alertsIndexPattern":".alerts-security.alerts-default","allow":["a","b","c"],"allowReplacement":["b","c"],"size":30}',
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          signal: undefined,
          version: '1',
        }
      );
    });

    it('calls the actions connector api with invoke when assistantStreamingEnabled is false when isEnabledKnowledgeBase is false', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        isEnabledKnowledgeBase: false,
        assistantStreamingEnabled: false,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"model":"gpt-4","message":"This is a test","subAction":"invokeAI","conversationId":"test","replacements":[],"isEnabledKnowledgeBase":false,"isEnabledRAGAlerts":false}',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: undefined,
          version: '1',
        }
      );
    });

    it('calls the actions connector api with invoke when assistantStreamingEnabled is true when isEnabledKnowledgeBase is false and isEnabledRAGAlerts is true', async () => {
      const testProps: FetchConnectorExecuteAction = {
        ...fetchConnectorArgs,
        isEnabledKnowledgeBase: false,
        isEnabledRAGAlerts: true,
      };

      await fetchConnectorExecuteAction(testProps);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/actions/connector/foo/_execute',
        {
          body: '{"model":"gpt-4","message":"This is a test","subAction":"invokeAI","conversationId":"test","replacements":[],"isEnabledKnowledgeBase":false,"isEnabledRAGAlerts":true}',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: undefined,
          version: '1',
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
        isEnabledKnowledgeBase: false,
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
        isEnabledKnowledgeBase: false,
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
        isEnabledKnowledgeBase: false,
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

    it('returns the original content when isEnabledKnowledgeBase is true, and `content` has properly formatted JSON WITHOUT the action_input property', async () => {
      const response = '```json\n{"some_key": "some value"}\n```';

      (mockHttp.fetch as jest.Mock).mockResolvedValue({
        status: 'ok',
        data: response,
      });

      const result = await fetchConnectorExecuteAction(fetchConnectorArgs);

      expect(result).toEqual({ response, isStream: false, isError: false });
    });

    it('returns the original when isEnabledKnowledgeBase is true, and `content` is not JSON', async () => {
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
          version: '1',
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
          version: '1',
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
          version: '1',
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
});
