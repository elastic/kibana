/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { AssistantUiSettings } from '../assistant/helpers';
import { AssistantProvider, useAssistantContext } from '.';

const mockApiConfig: AssistantUiSettings = {
  virusTotal: {
    apiKey: 'mock',
    baseUrl: 'https://www.virustotal.com/api/v3',
  },
  openAI: {
    apiKey: 'mock',
    baseUrl:
      'https://example.com/openai/deployments/example/chat/completions?api-version=2023-03-15-preview',
  },
};

const mockHttpFetch = jest.fn();

const ContextWrapper: React.FC = ({ children }) => (
  <AssistantProvider
    apiConfig={mockApiConfig}
    augmentMessageCodeBlocks={jest.fn()}
    conversations={{}}
    getComments={jest.fn()}
    httpFetch={mockHttpFetch}
    setConversations={jest.fn()}
  >
    {children}
  </AssistantProvider>
);

describe('AssistantContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it throws an error when useAssistantContext hook is used without a SecurityAssistantContext', () => {
    const { result } = renderHook(useAssistantContext);

    expect(result.error).toEqual(
      new Error('useAssistantContext must be used within a AssistantProvider')
    );
  });

  test('it should return the httpFetch function', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: ContextWrapper });
    const httpFetch = await result.current.httpFetch;

    const path = '/path/to/resource';
    httpFetch(path);

    expect(mockHttpFetch).toBeCalledWith(path);
  });
});
