/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { AGENT_BUILDER_NEW_CONVERSATION_PATH } from '../constants';
import { useOpenAgentBuilderChat } from './use_open_agent_builder_chat';

jest.mock('@kbn/core-di-browser');
jest.mock('@kbn/core-di', () => ({
  ...jest.requireActual('@kbn/core-di'),
  PluginStart: (key: string) => key,
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

describe('useOpenAgentBuilderChat', () => {
  const navigateToApp = jest.fn();
  const openChat = jest.fn();

  const setup = (agentBuilder: unknown) => {
    mockCoreStart.mockImplementation((key: string) => key as never);
    mockUseService.mockImplementation((token: unknown) => {
      if (token === 'agentBuilder') {
        return agentBuilder as never;
      }
      return { navigateToApp } as never;
    });
    return renderHook(() => useOpenAgentBuilderChat());
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a new conversation in the side chat and sends the message', () => {
    const { result } = setup({ openChat });

    act(() => result.current('alert on cpu'));

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'alert on cpu',
      autoSendInitialMessage: true,
    });
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('falls back to the Agent Builder app when the side chat is not available', () => {
    const { result } = setup(undefined);

    act(() => result.current('alert on cpu'));

    expect(navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
      state: { initialMessage: 'alert on cpu' },
    });
  });
});
