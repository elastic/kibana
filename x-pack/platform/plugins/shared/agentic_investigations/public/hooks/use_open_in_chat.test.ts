/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useOpenInChat } from './use_open_in_chat';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const navigateToApp = jest.fn();
let getUrlForApp: jest.Mock;

beforeEach(() => {
  getUrlForApp = jest.fn((_appId: string, { path = '' }: { path?: string } = {}) => `/mock${path}`);
  mockUseKibana.mockReturnValue({
    services: {
      application: { getUrlForApp, navigateToApp },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

afterEach(() => jest.clearAllMocks());

describe('useOpenInChat', () => {
  describe('getChatHref', () => {
    it('builds an agent-scoped path when agentId is provided', () => {
      const { result } = renderHook(() => useOpenInChat());
      const href = result.current.getChatHref('esc-1', 'agent-1');

      expect(getUrlForApp).toHaveBeenCalledWith(AGENTBUILDER_APP_ID, {
        path: '/agents/agent-1/conversations/esc-1?openConversationDetails=true',
      });
      expect(href).toBe('/mock/agents/agent-1/conversations/esc-1?openConversationDetails=true');
    });

    it('builds a legacy path when agentId is omitted', () => {
      const { result } = renderHook(() => useOpenInChat());
      const href = result.current.getChatHref('esc-1');

      expect(getUrlForApp).toHaveBeenCalledWith(AGENTBUILDER_APP_ID, {
        path: '/conversations/esc-1?openConversationDetails=true',
      });
      expect(href).toBe('/mock/conversations/esc-1?openConversationDetails=true');
    });

    it('URI-encodes the conversation and agent ids', () => {
      const { result } = renderHook(() => useOpenInChat());
      result.current.getChatHref('a b/c', 'ag ent');

      expect(getUrlForApp).toHaveBeenCalledWith(AGENTBUILDER_APP_ID, {
        path: '/agents/ag%20ent/conversations/a%20b%2Fc?openConversationDetails=true',
      });
    });

    it('returns undefined when conversationId is undefined', () => {
      const { result } = renderHook(() => useOpenInChat());
      const href = result.current.getChatHref(undefined, 'agent-1');

      expect(getUrlForApp).not.toHaveBeenCalled();
      expect(href).toBeUndefined();
    });

    it('returns undefined when getUrlForApp throws', () => {
      getUrlForApp.mockImplementation(() => {
        throw new Error('app not registered');
      });
      const { result } = renderHook(() => useOpenInChat());
      const href = result.current.getChatHref('esc-1', 'agent-1');

      expect(href).toBeUndefined();
    });
  });

  describe('openChat', () => {
    it('navigates to Agent Builder with the agent-scoped path', () => {
      const { result } = renderHook(() => useOpenInChat());
      result.current.openChat('esc-1', 'agent-1');

      expect(navigateToApp).toHaveBeenCalledWith(AGENTBUILDER_APP_ID, {
        path: '/agents/agent-1/conversations/esc-1?openConversationDetails=true',
      });
    });

    it('uses the legacy path when agentId is omitted', () => {
      const { result } = renderHook(() => useOpenInChat());
      result.current.openChat('esc-1');

      expect(navigateToApp).toHaveBeenCalledWith(AGENTBUILDER_APP_ID, {
        path: '/conversations/esc-1?openConversationDetails=true',
      });
    });

    it('does not navigate when conversationId is undefined', () => {
      const { result } = renderHook(() => useOpenInChat());
      result.current.openChat(undefined, 'agent-1');

      expect(navigateToApp).not.toHaveBeenCalled();
    });
  });
});
