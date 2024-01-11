/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { AssistantProvider, useAssistantContext } from '.';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { AssistantAvailability } from '../..';
import { useLocalStorage } from 'react-use';

jest.mock('react-use', () => ({
  useLocalStorage: jest.fn().mockReturnValue(['456', jest.fn()]),
}));
const actionTypeRegistry = actionTypeRegistryMock.create();
const mockGetInitialConversations = jest.fn(() => ({}));
const mockGetComments = jest.fn(() => []);
const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
const mockAssistantAvailability: AssistantAvailability = {
  hasAssistantPrivilege: false,
  hasConnectorsAllPrivilege: true,
  hasConnectorsReadPrivilege: true,
  isAssistantEnabled: true,
};

const ContextWrapper: React.FC = ({ children }) => (
  <AssistantProvider
    actionTypeRegistry={actionTypeRegistry}
    assistantAvailability={mockAssistantAvailability}
    assistantStreamingEnabled
    augmentMessageCodeBlocks={jest.fn()}
    baseAllow={[]}
    baseAllowReplacement={[]}
    basePath={'https://localhost:5601/kbn'}
    defaultAllow={[]}
    defaultAllowReplacement={[]}
    docLinks={{
      ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
      DOC_LINK_VERSION: 'current',
    }}
    getInitialConversations={mockGetInitialConversations}
    getComments={mockGetComments}
    http={mockHttp}
    setConversations={jest.fn()}
    setDefaultAllow={jest.fn()}
    setDefaultAllowReplacement={jest.fn()}
  >
    {children}
  </AssistantProvider>
);

describe('AssistantContext', () => {
  beforeEach(() => jest.clearAllMocks());

  test('it throws an error when useAssistantContext hook is used without a SecurityAssistantContext', () => {
    const { result } = renderHook(useAssistantContext);

    expect(result.error).toEqual(
      new Error('useAssistantContext must be used within a AssistantProvider')
    );
  });

  test('it should return the httpFetch function', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: ContextWrapper });
    const http = await result.current.http;

    const path = '/path/to/resource';
    await http.fetch(path);

    expect(mockHttp.fetch).toBeCalledWith(path);
  });

  test('getConversationId defaults to provided id', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: ContextWrapper });
    const id = result.current.getConversationId('123');
    expect(id).toEqual('123');
  });

  test('getConversationId uses local storage id when no id is provided ', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: ContextWrapper });
    const id = result.current.getConversationId();
    expect(id).toEqual('456');
  });

  test('getConversationId defaults to Welcome when no local storage id and no id is provided ', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
    const { result } = renderHook(useAssistantContext, { wrapper: ContextWrapper });
    const id = result.current.getConversationId();
    expect(id).toEqual('Welcome');
  });
});
