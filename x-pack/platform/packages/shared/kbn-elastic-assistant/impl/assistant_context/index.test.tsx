/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useAssistantContext } from '.';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { TestProviders } from '../mock/test_providers/test_providers';

jest.mock('react-use/lib/useLocalStorage', () =>
  jest.fn().mockReturnValue([{ id: '456' }, jest.fn()])
);
jest.mock('react-use/lib/useSessionStorage', () =>
  jest.fn().mockReturnValue([{ id: '456' }, jest.fn()])
);

describe('AssistantContext', () => {
  beforeEach(() => jest.clearAllMocks());

  test('it throws an error when useAssistantContext hook is used without a SecurityAssistantContext', () => {
    expect(() => renderHook(useAssistantContext)).toThrow(
      /useAssistantContext must be used within a AssistantProvider/
    );
  });

  test('it should return the httpFetch function', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });

    const path = '/path/to/resource';
    await result.current.http.fetch(path);

    expect(result.current.http.fetch).toBeCalledWith(path);
  });

  test('getLastConversation defaults to provided id', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });
    const id = result.current.getLastConversation({ id: '123' });
    expect(id).toEqual({ id: '123' });
  });

  test('getLastConversation uses local storage id when no id is provided ', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });
    const id = result.current.getLastConversation();
    expect(id).toEqual({ id: '456' });
  });

  test('getLastConversation defaults to empty id when no local storage id and no id is provided ', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });
    const id = result.current.getLastConversation();
    expect(id).toEqual({ id: '' });
  });

  test('getLastConversation defaults to empty id when title is provided and preserves title', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });
    const id = result.current.getLastConversation({ title: 'something' });
    expect(id).toEqual({ id: '', title: 'something' });
  });
});
