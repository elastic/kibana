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
} from '../../assistant_context/constants';

jest.mock('react-use/lib/useLocalStorage', () => jest.fn().mockReturnValue(['456', jest.fn()]));
const spaceId = 'test';

describe('useAssistantLastConversation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getLastConversationId defaults to provided id', async () => {
    const { result } = renderHook(() => useAssistantLastConversation({ spaceId }));
    const id = result.current.getLastConversationId('123');
    expect(id).toEqual('123');
  });

  test('getLastConversationId uses local storage id when no id is provided ', async () => {
    const { result } = renderHook(() => useAssistantLastConversation({ spaceId }));
    const id = result.current.getLastConversationId();
    expect(id).toEqual('456');
  });

  test('getLastConversationId defaults to Welcome when no local storage id and no id is provided ', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
    const { result } = renderHook(() => useAssistantLastConversation({ spaceId }));
    const id = result.current.getLastConversationId();
    expect(id).toEqual('Welcome');
  });

  describe.each([
    {
      expected: `${DEFAULT_ASSISTANT_NAMESPACE}.${LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY}.${spaceId}`,
    },
  ])('useLocalStorage is called with keys with correct spaceId', ({ expected }) => {
    test(`local storage key: ${expected}`, () => {
      renderHook(() => useAssistantLastConversation({ spaceId }));
      expect(useLocalStorage).toBeCalledWith(expected);
    });
  });
});
