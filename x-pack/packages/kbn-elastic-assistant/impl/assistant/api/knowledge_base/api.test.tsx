/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';

import { deleteKnowledgeBase, getKnowledgeBaseStatus, postKnowledgeBase } from './api';

jest.mock('@kbn/core-http-browser');

const mockHttp = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

describe('API tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
