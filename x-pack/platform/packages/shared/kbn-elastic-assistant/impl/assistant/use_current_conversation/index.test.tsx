/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import type { Props } from '.';
import { useCurrentConversation } from '.';
import { useConversation } from '../use_conversation';
import deepEqual from 'fast-deep-equal';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { Conversation } from '../../..';
import { find } from 'lodash';
import type { AIConnector } from '../../connectorland/connector_selector';
import { MOCK_CURRENT_USER } from '../../mock/conversation';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

// Mock dependencies
jest.mock('react-use/lib/useLocalStorage', () => jest.fn());
jest.mock('../use_conversation');
jest.mock('../helpers');
jest.mock('fast-deep-equal');
jest.mock('lodash');
const MOCK_DATE = '2025-02-19T23:28:54.962Z';
const defaultConnectorMock: AIConnector = createMockActionConnector({
  actionTypeId: '.gen-ai',
  referencedByCount: 0,
  secrets: {},
  id: 'c5f91dc0-2197-11ee-aded-897192c5d6f5',
  name: 'OpenAI',
  config: {
    apiProvider: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
  },
});
const mockData = {
  welcome_id: {
    id: 'welcome_id',
    title: 'Welcome',
    category: 'assistant',
    messages: [],
    apiConfig: {
      connectorId: '123',
      actionTypeId: '.gen-ai',
      defaultSystemPromptId: 'system-prompt-id',
    },
    replacements: {},
    createdAt: MOCK_DATE,
    createdBy: MOCK_CURRENT_USER,
    users: [MOCK_CURRENT_USER],
  },
  electric_sheep_id: {
    id: 'electric_sheep_id',
    category: 'assistant',
    title: 'electric sheep',
    messages: [],
    apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
    replacements: {},
    createdAt: MOCK_DATE,
    createdBy: MOCK_CURRENT_USER,
    users: [MOCK_CURRENT_USER],
  },
};
const setLastConversationMock = jest.fn();

describe('useCurrentConversation', () => {
  const mockUseConversation = {
    createConversation: jest.fn(),
    deleteConversation: jest.fn(),
    getConversation: jest.fn(),
    setApiConfig: jest.fn(),
  };
  beforeAll(() => {
    const mockDate = new Date(MOCK_DATE);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  });
  beforeEach(() => {
    (useConversation as jest.Mock).mockReturnValue(mockUseConversation);
    (deepEqual as jest.Mock).mockReturnValue(false);
    (find as jest.Mock).mockReturnValue(undefined);
    (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    (Date as unknown as jest.Mock).mockRestore();
  });

  const defaultProps: Props = {
    // @ts-ignore not exact system prompt type, ok for test
    allSystemPrompts: [{ id: 'system-prompt-id' }, { id: 'something-crazy' }],
    lastConversation: { id: '' },
    conversations: {},
    mayUpdateConversations: true,
    refetchCurrentUserConversations: jest.fn().mockResolvedValue({ data: mockData }),
    setLastConversation: setLastConversationMock,
    spaceId: 'default',
  };

  const setupHook = (props: Partial<Props> = {}) => {
    return renderHook(() => useCurrentConversation({ ...defaultProps, ...props }));
  };

  it('should initialize with correct default values', () => {
    const { result } = setupHook();

    expect(result.current.currentConversation).toEqual({
      category: 'assistant',
      id: '',
      messages: [],
      replacements: {},
      title: '',
      createdAt: MOCK_DATE,
      createdBy: {},
      users: [{}],
    });
    expect(result.current.currentSystemPrompt).toBeUndefined();
  });

  it('should initialize with apiConfig if defaultConnector is provided', () => {
    (useLocalStorage as jest.Mock).mockReturnValue(['456', jest.fn()]);
    const { result } = setupHook({
      defaultConnector: defaultConnectorMock,
    });

    expect(result.current.currentConversation).toEqual({
      category: 'assistant',
      id: '',
      messages: [],
      replacements: {},
      title: '',
      apiConfig: {
        actionTypeId: defaultConnectorMock.actionTypeId,
        connectorId: defaultConnectorMock.id,
      },
      createdAt: MOCK_DATE,
      createdBy: {},
      users: [{}],
    });
    expect(result.current.currentSystemPrompt).toBeUndefined();
  });

  it('should update apiConfig if defaultConnector goes from undefined to defined', async () => {
    (useLocalStorage as jest.Mock).mockReturnValue(['456', jest.fn()]);
    const initialProps = { ...defaultProps, defaultConnector: undefined };
    const { result, rerender } = renderHook(
      ({
        allSystemPrompts,
        lastConversation,
        conversations,
        mayUpdateConversations,
        refetchCurrentUserConversations,
        setLastConversation,
        spaceId,
        defaultConnector,
      }: Props) =>
        useCurrentConversation({
          allSystemPrompts,
          lastConversation,
          conversations,
          mayUpdateConversations,
          refetchCurrentUserConversations,
          setLastConversation,
          spaceId,
          defaultConnector,
        }),
      { initialProps }
    );
    expect(result.current.currentConversation).toEqual({
      category: 'assistant',
      id: '',
      messages: [],
      replacements: {},
      title: '',
      createdAt: MOCK_DATE,
      createdBy: {},
      users: [{}],
    });

    // @ts-ignore
    rerender({ ...defaultProps, defaultConnector: defaultConnectorMock });

    await waitFor(async () => {
      expect(result.current.currentConversation).toEqual({
        category: 'assistant',
        id: '',
        messages: [],
        replacements: {},
        title: '',
        apiConfig: {
          actionTypeId: defaultConnectorMock.actionTypeId,
          connectorId: defaultConnectorMock.id,
        },
        createdAt: MOCK_DATE,
        createdBy: {},
        users: [{}],
      });
    });
  });

  it('should initialize with local storage connectorId if app is security solution and local storage connectorId exists', () => {
    (useLocalStorage as jest.Mock).mockReturnValue(['456', jest.fn()]);
    const { result } = setupHook({
      currentAppId: 'securitySolutionUI',
      connectors: [
        defaultConnectorMock,
        {
          ...defaultConnectorMock,
          id: '456',
          actionTypeId: '.bedrock',
          name: 'My Bedrock',
        },
      ],
    });

    expect(result.current.currentConversation).toEqual({
      category: 'assistant',
      id: '',
      messages: [],
      replacements: {},
      title: '',
      apiConfig: {
        actionTypeId: '.bedrock',
        connectorId: '456',
      },
      createdAt: MOCK_DATE,
      createdBy: {},
      users: [{}],
    });
    expect(result.current.currentSystemPrompt).toBeUndefined();
  });

  it('should initialize without apiConfig if app is security solution and local storage connectorId does not exist', () => {
    const { result } = setupHook({
      currentAppId: 'securitySolutionUI',
      connectors: [
        defaultConnectorMock,
        {
          ...defaultConnectorMock,
          id: '456',
          actionTypeId: '.bedrock',
          name: 'My Bedrock',
        },
      ],
    });

    expect(result.current.currentConversation).toEqual({
      category: 'assistant',
      id: '',
      messages: [],
      replacements: {},
      title: '',
      createdAt: MOCK_DATE,
      createdBy: {},
      users: [{}],
    });
    expect(result.current.currentSystemPrompt).toBeUndefined();
  });

  it('should set the current system prompt ID when the prompt selection changes', async () => {
    const conversationId = 'welcome_id';
    const conversation = mockData.welcome_id;
    mockUseConversation.getConversation.mockResolvedValue(conversation);

    const { result } = setupHook({
      lastConversation: { id: conversationId },
      conversations: { [conversationId]: conversation },
    });

    await waitFor(() => expect(result.current.currentConversation).toEqual(conversation));
    await act(async () => {
      await result.current.setCurrentSystemPromptId('prompt-id');
    });

    expect(mockUseConversation.setApiConfig).toHaveBeenCalledWith({
      conversation,
      apiConfig: {
        ...conversation.apiConfig,
        defaultSystemPromptId: 'prompt-id',
      },
    });
    expect(defaultProps.refetchCurrentUserConversations).toHaveBeenCalled();
  });

  it('should handle conversation selection', async () => {
    const conversationId = 'test-id';
    const conversationTitle = 'Test Conversation';
    const conversation = {
      ...mockData.welcome_id,
      id: conversationId,
      title: conversationTitle,
      apiConfig: {
        ...mockData.welcome_id.apiConfig,
        defaultSystemPromptId: 'something-crazy',
      },
    } as Conversation;
    const mockConversations = {
      ...mockData,
      [conversationId]: conversation,
    };
    mockUseConversation.getConversation.mockResolvedValue(conversation);

    const { result } = setupHook({
      lastConversation: { id: mockData.welcome_id.id },
      conversations: mockConversations,
      refetchCurrentUserConversations: jest.fn().mockResolvedValue({
        data: mockConversations,
      }),
    });

    expect(mockUseConversation.getConversation).toHaveBeenCalledWith(mockData.welcome_id.id, false);

    await act(async () => {
      await result.current.handleOnConversationSelected({
        cId: conversationId,
      });
    });

    expect(mockUseConversation.getConversation).toHaveBeenCalledWith(conversationId, undefined);
    expect(result.current.currentConversation).toEqual(conversation);
    expect(result.current.currentSystemPrompt?.id).toBe('something-crazy');
  });

  it('should handle non-existing conversation selection', async () => {
    mockUseConversation.getConversation.mockResolvedValue(mockData.welcome_id);

    const { result } = setupHook({
      lastConversation: { id: mockData.welcome_id.id },
      conversations: mockData,
      refetchCurrentUserConversations: jest.fn().mockResolvedValue({
        data: mockData,
      }),
    });

    await waitFor(() => expect(result.current.currentConversation).toEqual(mockData.welcome_id));
    await act(async () => {
      await result.current.handleOnConversationSelected({
        cId: '',
      });
    });

    await waitFor(() =>
      expect(result.current.currentConversation).toEqual({
        ...mockData.welcome_id,
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: '123',
          defaultSystemPromptId: 'system-prompt-id',
        },
        id: '',
        title: '',
        createdAt: MOCK_DATE,
        createdBy: {},
        users: [{}],
      })
    );
    expect(result.current.currentSystemPrompt?.id).toBe('system-prompt-id');
  });

  it('should NOT create a new conversation on handleCreateConversation', async () => {
    mockUseConversation.getConversation.mockResolvedValue(mockData.welcome_id);
    const { result } = setupHook({
      lastConversation: { id: mockData.welcome_id.id },
      conversations: mockData,
      refetchCurrentUserConversations: jest.fn().mockResolvedValue({
        data: mockData,
      }),
    });
    await waitFor(() => expect(result.current.currentConversation).toEqual(mockData.welcome_id));

    await act(async () => {
      await result.current.handleCreateConversation();
    });

    await waitFor(() =>
      expect(result.current.currentConversation).toEqual({
        ...mockData.welcome_id,
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: '123',
          defaultSystemPromptId: 'system-prompt-id',
        },
        id: '',
        title: '',
        createdAt: MOCK_DATE,
        createdBy: {},
        users: [{}],
      })
    );
  });

  it('should delete a conversation', async () => {
    const conversationTitle = 'Test Conversation';
    const conversation = {
      ...mockData.welcome_id,
      id: 'test-id',
      title: conversationTitle,
      messages: [],
    } as Conversation;

    const { result } = setupHook({
      conversations: { ...mockData, 'test-id': conversation },
    });

    await act(async () => {
      await result.current.handleOnConversationDeleted('test-id');
    });

    expect(mockUseConversation.deleteConversation).toHaveBeenCalledWith('test-id');
    expect(result.current.currentConversation).toEqual({
      category: 'assistant',
      id: '',
      messages: [],
      replacements: {},
      title: '',
      createdAt: MOCK_DATE,
      createdBy: {},
      users: [{}],
    });
  });

  it('should refetch the conversation multiple times if isStreamRefetch is true', async () => {
    const conversationId = 'test-id';
    const conversation = {
      id: conversationId,
      messages: [{ role: 'user' }],
      users: [MOCK_CURRENT_USER],
      createdBy: MOCK_CURRENT_USER,
    } as Conversation;
    mockUseConversation.getConversation.mockResolvedValue(conversation);

    const { result } = setupHook({
      lastConversation: { id: conversationId },
      conversations: { [conversationId]: conversation },
    });

    await act(async () => {
      await result.current.refetchCurrentConversation({
        cId: conversationId,
        isStreamRefetch: true,
      });
    });

    expect(mockUseConversation.getConversation).toHaveBeenCalledTimes(7); // initial set + refetch call + 5 retries
  });

  it('should set isConversationOwner={true}', async () => {
    const { result } = setupHook({
      conversations: mockData,
      currentUser: MOCK_CURRENT_USER,
    });
    await act(async () => {
      await result.current.setCurrentConversation(mockData.welcome_id);
    });

    await waitFor(() => expect(result.current.isConversationOwner).toEqual(true));
  });

  it('should set isConversationOwner={false}', async () => {
    const anotherUser = { name: 'another-user' };
    const conversation = {
      ...mockData.welcome_id,
      users: [anotherUser],
      createdBy: anotherUser,
    } as Conversation;

    const { result } = setupHook({
      conversations: { ...mockData, welcome_id: conversation },
      currentUser: { name: 'elastic' },
    });
    await act(async () => {
      await result.current.setCurrentConversation(conversation);
    });

    await waitFor(() => expect(result.current.isConversationOwner).toEqual(false));
  });

  it('should set conversationSharedState={private}', async () => {
    const { result } = setupHook({
      conversations: mockData,
    });
    await act(async () => {
      await result.current.setCurrentConversation(mockData.welcome_id);
    });

    await waitFor(() => expect(result.current.conversationSharedState).toEqual('private'));
  });

  it('should set conversationSharedState={restricted}', async () => {
    const conversation = {
      ...mockData.welcome_id,
      users: [MOCK_CURRENT_USER, { name: 'another-user' }],
    } as Conversation;

    const { result } = setupHook({
      conversations: { ...mockData, welcome_id: conversation },
    });
    await act(async () => {
      await result.current.setCurrentConversation(conversation);
    });

    await waitFor(() => expect(result.current.conversationSharedState).toEqual('restricted'));
  });

  it('should set conversationSharedState={shared}', async () => {
    const conversation = {
      ...mockData.welcome_id,
      users: [],
    } as Conversation;

    const { result } = setupHook({
      conversations: { ...mockData, welcome_id: conversation },
    });
    await act(async () => {
      await result.current.setCurrentConversation(conversation);
    });

    await waitFor(() => expect(result.current.conversationSharedState).toEqual('shared'));
  });
});
