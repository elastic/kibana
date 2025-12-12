/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { renderHook } from '@testing-library/react';
import { useAssistantLastConversation } from './use_last_conversation';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY,
  LAST_SELECTED_CONVERSATION_LOCAL_STORAGE_KEY,
} from '../../assistant_context/constants';

jest.mock('react-use/lib/useLocalStorage', () =>
  jest.fn().mockReturnValue([{ id: '456' }, jest.fn()])
);
const spaceId = 'test';

describe('useAssistantLastConversation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getLastConversation defaults to provided id', () => {
    const { result } = renderHook(() => useAssistantLastConversation({ spaceId }));
    const id = result.current.getLastConversation({ id: '123' });
    expect(id).toEqual({ id: '123' });
  });

  test('getLastConversation uses local storage id when no id is provided ', () => {
    const { result } = renderHook(() => useAssistantLastConversation({ spaceId }));
    const id = result.current.getLastConversation();
    expect(id).toEqual({ id: '456' });
  });

  test('getLastConversation defaults to empty id when no local storage id and no id is provided ', () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
    const { result } = renderHook(() => useAssistantLastConversation({ spaceId }));
    const id = result.current.getLastConversation();
    expect(id).toEqual({ id: '' });
  });

  test('getLastConversation defaults to empty id when title is provided and preserves title', () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
    const { result } = renderHook(() => useAssistantLastConversation({ spaceId }));
    const id = result.current.getLastConversation({ title: 'something' });
    expect(id).toEqual({ id: '', title: 'something' });
  });

  describe.each([
    {
      expected: `${DEFAULT_ASSISTANT_NAMESPACE}.${LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY}.${spaceId}`,
    },
    {
      expected: `${DEFAULT_ASSISTANT_NAMESPACE}.${LAST_SELECTED_CONVERSATION_LOCAL_STORAGE_KEY}.${spaceId}`,
    },
  ])('useLocalStorage is called with keys with correct spaceId', ({ expected }) => {
    test(`local storage key: ${expected}`, () => {
      renderHook(() => useAssistantLastConversation({ spaceId }));
      expect(useLocalStorage).toBeCalledWith(expected);
    });
  });
});
