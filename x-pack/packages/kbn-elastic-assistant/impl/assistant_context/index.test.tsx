/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useAssistantContext } from '.';
import { useLocalStorage } from 'react-use';
import { TestProviders } from '../mock/test_providers/test_providers';

jest.mock('react-use', () => ({
  useLocalStorage: jest.fn().mockReturnValue(['456', jest.fn()]),
  useSessionStorage: jest.fn().mockReturnValue(['456', jest.fn()]),
}));

describe('AssistantContext', () => {
  beforeEach(() => jest.clearAllMocks());

  test('it throws an error when useAssistantContext hook is used without a SecurityAssistantContext', () => {
    const { result } = renderHook(useAssistantContext);

    expect(result.error).toEqual(
      new Error('useAssistantContext must be used within a AssistantProvider')
    );
  });

  test('it should return the httpFetch function', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });

    const path = '/path/to/resource';
    await result.current.http.fetch(path);

    expect(result.current.http.fetch).toBeCalledWith(path);
  });

  test('getLastConversationId defaults to provided id', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });
    const id = result.current.getLastConversationId('123');
    expect(id).toEqual('123');
  });

  test('getLastConversationId uses local storage id when no id is provided ', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });
    const id = result.current.getLastConversationId();
    expect(id).toEqual('456');
  });

  test('getLastConversationId defaults to Welcome when no local storage id and no id is provided ', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });
    const id = result.current.getLastConversationId();
    expect(id).toEqual('Welcome');
  });
});
