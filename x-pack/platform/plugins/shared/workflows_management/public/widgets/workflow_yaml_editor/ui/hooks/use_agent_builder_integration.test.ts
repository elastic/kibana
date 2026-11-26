/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ActiveConversation, BrowserChatEvent } from '@kbn/agent-builder-browser';
import type {
  ConversationAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import {
  type OpenAgentChatOptions,
  useAgentBuilderIntegration,
} from './use_agent_builder_integration';
import { useKibana } from '../../../../hooks/use_kibana';

const mockDispatch = jest.fn();
jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useDispatch: () => mockDispatch,
}));
jest.mock('../../../../hooks/use_kibana');
const mockTelemetry = {
  reportWorkflowAiChatOpened: jest.fn(),
  reportWorkflowAiSessionCompleted: jest.fn(),
  reportAiProposalReceived: jest.fn(),
  reportAiProposalResolved: jest.fn(),
};
jest.mock('../../../../hooks/use_telemetry', () => ({
  useTelemetry: () => mockTelemetry,
}));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: jest.fn(),
}));
const useUiSettingMock = useUiSetting as jest.MockedFunction<typeof useUiSetting>;
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));
jest.mock('../../../../features/ai_integration', () => ({
  AttachmentBridge: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    setAttachmentId: jest.fn(),
    applyDeferred: jest.fn(),
    hasDeferred: jest.fn().mockReturnValue(true),
  })),
  ProposalManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    getDiffHunks: jest.fn().mockReturnValue([]),
    hasPendingProposals: jest.fn().mockReturnValue(false),
    suspend: jest.fn(),
    resume: jest.fn(),
    hasSuspendedProposals: jest.fn().mockReturnValue(false),
  })),
  setActiveProposalManager: jest.fn(),
  setLastCreateSessionId: jest.fn(),
  setLastCreateAgentId: jest.fn(),
  takeCarriedAgentFor: jest.fn().mockReturnValue(undefined),
  getWorkflowEditorSessionTag: jest.requireActual('../../../../features/ai_integration')
    .getWorkflowEditorSessionTag,
  isWorkflowEditorSessionTag: jest.requireActual('../../../../features/ai_integration')
    .isWorkflowEditorSessionTag,
  setSidebarOpen: jest.fn(),
  consumeSidebarRestoreFor: jest.fn().mockReturnValue(false),
  hasPersistedConversation: jest.fn().mockReturnValue(false),
  findLinkedWorkflowAttachment: jest.requireActual('../../../../features/ai_integration')
    .findLinkedWorkflowAttachment,
  WORKFLOW_EDITOR_ATTACHMENT_ID: jest.requireActual('../../../../features/ai_integration')
    .WORKFLOW_EDITOR_ATTACHMENT_ID,
}));

type AiIntegrationModule = typeof import('../../../../features/ai_integration');
const {
  setLastCreateSessionId: mockSetLastCreateSessionId,
  setLastCreateAgentId: mockSetLastCreateAgentId,
  takeCarriedAgentFor: mockTakeCarriedAgentFor,
  setSidebarOpen: mockSetSidebarOpen,
  consumeSidebarRestoreFor: mockConsumeSidebarRestoreFor,
  hasPersistedConversation: mockHasPersistedConversation,
} = jest.requireMock('../../../../features/ai_integration') as {
  setLastCreateSessionId: jest.MockedFunction<AiIntegrationModule['setLastCreateSessionId']>;
  setLastCreateAgentId: jest.MockedFunction<AiIntegrationModule['setLastCreateAgentId']>;
  takeCarriedAgentFor: jest.MockedFunction<AiIntegrationModule['takeCarriedAgentFor']>;
  setSidebarOpen: jest.MockedFunction<AiIntegrationModule['setSidebarOpen']>;
  consumeSidebarRestoreFor: jest.MockedFunction<AiIntegrationModule['consumeSidebarRestoreFor']>;
  hasPersistedConversation: jest.MockedFunction<AiIntegrationModule['hasPersistedConversation']>;
};
const { AttachmentBridge: mockAttachmentBridge, ProposalManager: mockProposalManager } =
  jest.requireMock('../../../../features/ai_integration') as {
    AttachmentBridge: jest.Mock;
    ProposalManager: jest.Mock;
  };
jest.mock('../../../../features/ai_integration/proposal_tracker', () => ({
  ProposalTracker: jest.fn().mockImplementation(() => ({
    onAllResolved: jest.fn().mockReturnValue(jest.fn()),
    updateStatus: jest.fn(),
    cascadeDecline: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
    getAllRecords: jest.fn().mockReturnValue([]),
  })),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

type ContentChangeCallback = () => void;

const createMockModel = (value = 'name: test-workflow') => {
  let contentChangeCallback: ContentChangeCallback | null = null;
  return {
    getValue: jest.fn().mockReturnValue(value),
    onDidChangeContent: jest.fn((cb: ContentChangeCallback) => {
      contentChangeCallback = cb;
      return { dispose: jest.fn() };
    }),
    simulateContentChange: (newValue?: string) => {
      if (newValue) {
        (mockModel.getValue as jest.Mock).mockReturnValue(newValue);
      }
      contentChangeCallback?.();
    },
  };
};

let mockModel: ReturnType<typeof createMockModel>;

const createMockEditor = (model: ReturnType<typeof createMockModel>) =>
  ({ getModel: jest.fn().mockReturnValue(model) } as any);

const embeddableChatAccessReady = {
  hasRequiredLicense: true,
  hasLlmConnector: true,
} as const;

const createMockAgentBuilder = () => ({
  addAttachment: jest.fn(),
  removeAttachment: jest.fn(),
  setChatConfig: jest.fn(),
  clearChatConfig: jest.fn(),
  openChat: jest.fn().mockReturnValue({ chatRef: { close: jest.fn() } }),
  getAgentBuilderAccess: jest.fn().mockResolvedValue(embeddableChatAccessReady),
  events: {
    chat$: new Subject<BrowserChatEvent>(),
    getChatEvents$: jest.fn(() => new Subject<BrowserChatEvent>().asObservable()),
    ui: { activeConversation$: new BehaviorSubject<ActiveConversation | null>(null) },
  },
  updateAttachmentOrigin: jest.fn().mockResolvedValue(undefined),
  tools: {},
  attachments: {},
});

const flushChatAccessCheck = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const setupKibanaMock = (
  agentBuilder?: ReturnType<typeof createMockAgentBuilder>,
  options: { hasShowPrivilege?: boolean } = {}
) => {
  const { hasShowPrivilege = true } = options;
  useKibanaMock.mockReturnValue({
    services: {
      workflowsManagement: {
        agentBuilder,
      },
      application: {
        capabilities: {
          agentBuilder: { show: hasShowPrivilege },
        },
      },
    },
  } as any);
};

const INITIAL_YAML = 'name: test-workflow';

const MOCK_UUID = 'mock-uuid-1234';

// The editor's attachment id is fixed; only the chat session tag follows the route.
const ATTACHMENT_ID = 'workflow-yaml-editor';

const expectedAttachment = (yaml: string, overrides?: { workflowId?: string; name?: string }) => ({
  id: ATTACHMENT_ID,
  type: WORKFLOW_YAML_ATTACHMENT_TYPE,
  ...(overrides?.workflowId ? { origin: overrides.workflowId } : {}),
  data: {
    yaml,
    workflowId: overrides?.workflowId,
    name: overrides?.name,
    clientDiagnostics: undefined,
  },
});

const WORKFLOW_EDITOR_GREETING = 'What do you want to automate?';

const expectedChatConfig = (
  attachment: ReturnType<typeof expectedAttachment>,
  attachmentId: string = MOCK_UUID
) => ({
  sessionTag: `workflow-editor:${attachmentId}`,
  greetingMessage: WORKFLOW_EDITOR_GREETING,
  attachments: [attachment],
});

describe('useAgentBuilderIntegration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockModel = createMockModel(INITIAL_YAML);
    mockConsumeSidebarRestoreFor.mockReturnValue(false);
    mockHasPersistedConversation.mockReturnValue(false);
    mockTakeCarriedAgentFor.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('selected agent and conversation changes', () => {
    const publishAgent = (
      agentBuilder: ReturnType<typeof createMockAgentBuilder>,
      agentId: string | undefined,
      conversation: Omit<ActiveConversation, 'agentId'> = { id: undefined }
    ) => {
      act(() => {
        agentBuilder.events.ui.activeConversation$.next({
          ...conversation,
          agentId,
        });
      });
    };

    it('keeps the implicit default agent session key until the user changes agents', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      renderHook(() => useAgentBuilderIntegration({ editorRef, isEditorMounted: true }));
      await flushChatAccessCheck();
      publishAgent(agentBuilder, undefined);

      act(() => {
        mockModel.simulateContentChange('name: default agent edit');
        jest.advanceTimersByTime(500);
      });
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: undefined })
      );

      publishAgent(agentBuilder, 'custom-workflow-agent');
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent', newConversation: true })
      );
      publishAgent(agentBuilder, 'elastic-ai-agent');
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'elastic-ai-agent', newConversation: true })
      );
    });

    it('keeps the selected agent across YAML edits, tab changes and reopening the chat', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      const initialProps: { readOnlyReason?: 'executions_tab' } = {};
      const { result, rerender } = renderHook(
        ({ readOnlyReason }) =>
          useAgentBuilderIntegration({ editorRef, isEditorMounted: true, readOnlyReason }),
        { initialProps }
      );
      await flushChatAccessCheck();
      publishAgent(agentBuilder, 'elastic-ai-agent');
      publishAgent(agentBuilder, 'custom-workflow-agent');

      act(() => {
        mockModel.simulateContentChange('name: edited');
        jest.advanceTimersByTime(500);
      });
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent' })
      );

      rerender({ readOnlyReason: 'executions_tab' });
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent' })
      );

      act(() => result.current.openAgentChat());
      expect(agentBuilder.openChat).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent' })
      );
    });

    it('reattaches the current YAML when switching agents in an empty chat', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      renderHook(() => useAgentBuilderIntegration({ editorRef, isEditorMounted: true }));
      await flushChatAccessCheck();
      publishAgent(agentBuilder, 'elastic-ai-agent');
      agentBuilder.addAttachment.mockClear();

      publishAgent(agentBuilder, 'custom-workflow-agent');

      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expectedAttachment(INITIAL_YAML));
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent', newConversation: true })
      );
      agentBuilder.addAttachment.mockClear();
      publishAgent(agentBuilder, 'another-agent');
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expectedAttachment(INITIAL_YAML));
    });

    it('preserves an explicit new conversation request during YAML sync', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      const { result } = renderHook(() =>
        useAgentBuilderIntegration({ editorRef, isEditorMounted: true })
      );
      await flushChatAccessCheck();
      publishAgent(agentBuilder, 'custom-workflow-agent', { id: 'previous-conversation' });

      act(() => result.current.openAgentChat({ newConversation: true }));
      publishAgent(agentBuilder, 'custom-workflow-agent');
      act(() => {
        mockModel.simulateContentChange('name: new conversation');
        jest.advanceTimersByTime(500);
      });

      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent', newConversation: true })
      );
    });

    it('keeps a switched agent in a new chat until its conversation binding arrives', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      renderHook(() => useAgentBuilderIntegration({ editorRef, isEditorMounted: true }));
      await flushChatAccessCheck();
      publishAgent(agentBuilder, 'elastic-ai-agent');
      publishAgent(agentBuilder, 'custom-workflow-agent');

      act(() => {
        mockModel.simulateContentChange('name: edited before sending');
        jest.advanceTimersByTime(500);
      });
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent', newConversation: true })
      );

      publishAgent(agentBuilder, 'custom-workflow-agent', { id: 'new-custom-conversation' });
      agentBuilder.addAttachment.mockClear();
      act(() => {
        mockModel.simulateContentChange('name: edited while loading');
        jest.advanceTimersByTime(500);
      });
      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();

      publishAgent(agentBuilder, 'custom-workflow-agent', {
        id: 'new-custom-conversation',
        conversation: {
          id: 'new-custom-conversation',
          agent_id: 'custom-workflow-agent',
          user: { id: 'test-user', username: 'test-user' },
          title: 'Test conversation',
          created_at: '2026-11-23T00:00:00.000Z',
          updated_at: '2026-11-23T00:00:00.000Z',
          rounds: [],
          attachments: [],
        },
      });
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith({
        ...expectedChatConfig(expectedAttachment('name: edited while loading')),
        agentId: 'custom-workflow-agent',
        newConversation: undefined,
      });
    });

    it('uses the editor attachment instead of a previous conversation attachment in a new chat', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      renderHook(() =>
        useAgentBuilderIntegration({ editorRef, isEditorMounted: true, workflowId: 'workflow-a' })
      );
      await flushChatAccessCheck();
      publishAgent(agentBuilder, 'elastic-ai-agent', {
        id: 'old-conversation',
        conversation: {
          attachments: [
            { id: 'legacy-attachment', type: WORKFLOW_YAML_ATTACHMENT_TYPE, origin: 'workflow-a' },
          ],
        } as ActiveConversation['conversation'],
      });
      agentBuilder.addAttachment.mockClear();

      publishAgent(agentBuilder, 'custom-workflow-agent');

      expect(agentBuilder.addAttachment).toHaveBeenLastCalledWith(
        expectedAttachment(INITIAL_YAML, { workflowId: 'workflow-a' })
      );
      const bridge = mockAttachmentBridge.mock.results.at(-1)?.value;
      expect(bridge.setAttachmentId).toHaveBeenLastCalledWith(ATTACHMENT_ID);
    });

    it('clears chat config only when the editor unmounts', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      const initialProps: { workflowId?: string } = {};
      const { rerender, unmount } = renderHook(
        ({ workflowId }) =>
          useAgentBuilderIntegration({ editorRef, isEditorMounted: true, workflowId }),
        { initialProps }
      );
      await flushChatAccessCheck();
      publishAgent(agentBuilder, 'custom-workflow-agent');
      rerender({ workflowId: 'saved-workflow' });

      expect(agentBuilder.clearChatConfig).not.toHaveBeenCalled();
      expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ agentId: 'custom-workflow-agent' })
      );
      unmount();
      expect(agentBuilder.clearChatConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('chat surfaces and pending open options', () => {
    const OWN_TAG = `workflow-editor:${MOCK_UUID}`;
    const DIAGNOSE_TAG = 'workflow-execution-diagnose:execution-1:step-1';

    const loadedConversation = (id: string) =>
      ({ id, attachments: [] } as unknown as ActiveConversation['conversation']);

    const publish = (
      agentBuilder: ReturnType<typeof createMockAgentBuilder>,
      binding: ActiveConversation | null
    ) => {
      act(() => {
        agentBuilder.events.ui.activeConversation$.next(binding);
      });
    };

    const publishOwn = (
      agentBuilder: ReturnType<typeof createMockAgentBuilder>,
      binding: ActiveConversation,
      sessionTag = OWN_TAG
    ) => publish(agentBuilder, { ...binding, sessionTag });

    const renderEditor = async (
      agentBuilder: ReturnType<typeof createMockAgentBuilder>,
      workflowId?: string
    ) => {
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      const rendered = renderHook(() =>
        useAgentBuilderIntegration({ editorRef, isEditorMounted: true, workflowId })
      );
      await flushChatAccessCheck();
      return rendered;
    };

    const clearCalls = (agentBuilder: ReturnType<typeof createMockAgentBuilder>) => {
      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();
      agentBuilder.removeAttachment.mockClear();
    };

    describe('other chat surfaces', () => {
      it('leaves a chat from another surface alone', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, {
          id: 'editor-conversation',
          agentId: 'custom-workflow-agent',
          conversation: loadedConversation('editor-conversation'),
        });
        clearCalls(agentBuilder);

        // "Diagnose with AI" starts a new conversation under its own session tag.
        publishOwn(agentBuilder, { id: undefined, agentId: undefined }, DIAGNOSE_TAG);
        publishOwn(agentBuilder, { id: 'diagnosis-conversation' }, DIAGNOSE_TAG);
        publishOwn(
          agentBuilder,
          {
            id: 'diagnosis-conversation',
            conversation: loadedConversation('diagnosis-conversation'),
          },
          DIAGNOSE_TAG
        );

        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
        expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
        expect(agentBuilder.removeAttachment).not.toHaveBeenCalled();
      });

      it('does not mistake a conversation of another surface for the editor chat', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, {
          id: 'editor-conversation',
          agentId: 'custom-workflow-agent',
          conversation: loadedConversation('editor-conversation'),
        });
        publishOwn(agentBuilder, { id: undefined, agentId: undefined }, DIAGNOSE_TAG);
        publish(agentBuilder, null);
        publishOwn(agentBuilder, {
          id: 'editor-conversation',
          agentId: 'custom-workflow-agent',
          conversation: loadedConversation('editor-conversation'),
        });

        act(() => {
          mockModel.simulateContentChange('name: edited');
          jest.advanceTimersByTime(500);
        });

        // Still the editor chat's agent, and nothing says the editor chat changed.
        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ agentId: 'custom-workflow-agent', newConversation: undefined })
        );
      });

      it('keeps its hands off a chat from another surface when the YAML changes', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, { id: undefined, agentId: undefined });
        publishOwn(agentBuilder, { id: undefined, agentId: undefined }, DIAGNOSE_TAG);
        clearCalls(agentBuilder);

        act(() => {
          mockModel.simulateContentChange('name: edited while diagnosing');
          jest.advanceTimersByTime(500);
        });

        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
        expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
      });

      it('brings the attachment up to date once the editor chat is back', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, { id: undefined, agentId: undefined });
        publishOwn(agentBuilder, { id: undefined, agentId: undefined }, DIAGNOSE_TAG);
        act(() => {
          mockModel.simulateContentChange('name: edited while diagnosing');
          jest.advanceTimersByTime(500);
        });
        publish(agentBuilder, null);
        clearCalls(agentBuilder);

        publishOwn(agentBuilder, { id: undefined, agentId: undefined });

        // A chat that has just mounted keeps its open options, and takes the new YAML.
        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
        expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
          expectedAttachment('name: edited while diagnosing')
        );
      });

      it('does not sync on mount while a chat from another surface holds the sidebar', async () => {
        const agentBuilder = createMockAgentBuilder();
        publishOwn(agentBuilder, { id: undefined, agentId: undefined }, DIAGNOSE_TAG);

        await renderEditor(agentBuilder);

        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
        expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
      });

      it('still follows the chat session another workflow editor left in the sidebar', async () => {
        // Saving a draft remounts the editor, so a sidebar the user opened themselves
        // can still hold the draft's session when the saved workflow's editor mounts.
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder, 'workflow-a');
        agentBuilder.setChatConfig.mockClear();

        publishOwn(
          agentBuilder,
          { id: 'conversation-1', conversation: loadedConversation('conversation-1') },
          'workflow-editor:draft-uuid'
        );

        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ sessionTag: 'workflow-editor:workflow-a' })
        );
      });
    });

    describe('saved chat config while a conversation loads', () => {
      it('stops asking for a new conversation as soon as an id is bound', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, { id: undefined, agentId: 'elastic-ai-agent' });
        publishOwn(agentBuilder, { id: undefined, agentId: 'custom-workflow-agent' });
        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ newConversation: true })
        );
        clearCalls(agentBuilder);

        // The user picks a conversation from the history and it has not loaded yet.
        publishOwn(agentBuilder, { id: 'history-conversation', agentId: 'custom-workflow-agent' });

        expect(agentBuilder.setChatConfig).toHaveBeenCalledTimes(1);
        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith({
          agentId: 'custom-workflow-agent',
          newConversation: undefined,
          sessionTag: OWN_TAG,
          greetingMessage: WORKFLOW_EDITOR_GREETING,
          attachments: undefined,
        });
        // Whether the loaded conversation already holds the attachment is not known yet.
        expect(agentBuilder.addAttachment).not.toHaveBeenCalled();

        publishOwn(agentBuilder, { id: 'history-conversation', agentId: 'custom-workflow-agent' });
        expect(agentBuilder.setChatConfig).toHaveBeenCalledTimes(1);
      });

      it('drops the flag for the first message of a chat that switched agents', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, { id: undefined, agentId: 'elastic-ai-agent' });
        publishOwn(agentBuilder, { id: undefined, agentId: 'custom-workflow-agent' });
        clearCalls(agentBuilder);

        // Sending creates the conversation before its id is set, so the binding carries it.
        publishOwn(agentBuilder, {
          id: 'new-conversation',
          agentId: 'custom-workflow-agent',
          conversation: loadedConversation('new-conversation'),
        });

        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ agentId: 'custom-workflow-agent', newConversation: undefined })
        );
      });

      it('leaves the saved config alone when it never asked for a new conversation', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, { id: undefined, agentId: undefined });
        clearCalls(agentBuilder);

        publishOwn(agentBuilder, { id: 'restored-conversation', agentId: undefined });

        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
      });
    });

    describe('open options of a chat that has just mounted', () => {
      const openFixWithAi = (result: {
        current: { openAgentChat: (options?: OpenAgentChatOptions) => void };
      }) =>
        act(() =>
          result.current.openAgentChat({
            initialMessage: 'Fix the validation error',
            autoSendInitialMessage: false,
            newConversation: true,
          })
        );

      it('refreshes the attachment without replacing the open options', async () => {
        const agentBuilder = createMockAgentBuilder();
        const { result } = await renderEditor(agentBuilder);
        publishOwn(agentBuilder, {
          id: 'old-conversation',
          agentId: undefined,
          conversation: loadedConversation('old-conversation'),
        });
        publish(agentBuilder, null);
        openFixWithAi(result);
        clearCalls(agentBuilder);

        // The chat is not rendered yet, so replacing its props would drop the prompt.
        publishOwn(agentBuilder, { id: undefined, agentId: undefined });

        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
        expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expectedAttachment(INITIAL_YAML));
      });

      it('still publishes the config for the next change of that chat', async () => {
        const agentBuilder = createMockAgentBuilder();
        const { result } = await renderEditor(agentBuilder);
        publishOwn(agentBuilder, {
          id: 'old-conversation',
          agentId: undefined,
          conversation: loadedConversation('old-conversation'),
        });
        publish(agentBuilder, null);
        openFixWithAi(result);
        publishOwn(agentBuilder, { id: undefined, agentId: undefined });
        clearCalls(agentBuilder);

        publishOwn(agentBuilder, { id: undefined, agentId: 'custom-workflow-agent' });

        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ agentId: 'custom-workflow-agent', newConversation: true })
        );
      });

      it('treats the chat that binds after the sidebar closed as just mounted', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, { id: undefined, agentId: undefined });
        publishOwn(agentBuilder, { id: undefined, agentId: 'custom-workflow-agent' });
        publish(agentBuilder, null);
        clearCalls(agentBuilder);

        publishOwn(agentBuilder, { id: undefined, agentId: 'custom-workflow-agent' });
        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();

        publishOwn(agentBuilder, { id: undefined, agentId: 'another-agent' });
        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ agentId: 'another-agent' })
        );
      });

      it('adopts a chat that carries no session tag', async () => {
        // With a conversation to restore the editor publishes no config until it knows
        // that conversation's attachment, so a sidebar opened meanwhile has no tag.
        mockHasPersistedConversation.mockReturnValue(true);
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();

        publish(agentBuilder, { id: undefined });

        expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
          expect.objectContaining({ sessionTag: OWN_TAG })
        );
      });
    });

    describe('agent across the first save', () => {
      it('keeps the agent the create route had selected', async () => {
        mockTakeCarriedAgentFor.mockImplementation((workflowId) =>
          workflowId === 'saved-workflow' ? 'custom-workflow-agent' : undefined
        );
        const agentBuilder = createMockAgentBuilder();
        const { result } = await renderEditor(agentBuilder, 'saved-workflow');

        expect(mockTakeCarriedAgentFor).toHaveBeenCalledWith('saved-workflow');
        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ agentId: 'custom-workflow-agent' })
        );

        act(() => result.current.openAgentChat());
        expect(agentBuilder.openChat).toHaveBeenLastCalledWith(
          expect.objectContaining({
            agentId: 'custom-workflow-agent',
            sessionTag: 'workflow-editor:saved-workflow',
          })
        );

        // The restored chat reports that same agent, which is not a change.
        clearCalls(agentBuilder);
        publishOwn(
          agentBuilder,
          { id: undefined, agentId: 'custom-workflow-agent' },
          'workflow-editor:saved-workflow'
        );
        expect(agentBuilder.setChatConfig).not.toHaveBeenCalledWith(
          expect.objectContaining({ newConversation: true })
        );
      });

      it('takes the carried agent once and then follows the user', async () => {
        mockTakeCarriedAgentFor.mockReturnValueOnce('custom-workflow-agent');
        const agentBuilder = createMockAgentBuilder();
        const { rerender } = await renderEditor(agentBuilder, 'saved-workflow');
        const savedTag = 'workflow-editor:saved-workflow';
        publishOwn(agentBuilder, { id: undefined, agentId: 'custom-workflow-agent' }, savedTag);
        publishOwn(agentBuilder, { id: undefined, agentId: 'second-custom-agent' }, savedTag);

        rerender();

        expect(mockTakeCarriedAgentFor).toHaveBeenCalledTimes(1);
        expect(agentBuilder.setChatConfig).toHaveBeenLastCalledWith(
          expect.objectContaining({ agentId: 'second-custom-agent', newConversation: true })
        );
      });

      it('hands the selected agent to the save on the create route only', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder);
        publishOwn(agentBuilder, { id: undefined, agentId: 'custom-workflow-agent' });

        expect(mockSetLastCreateAgentId).toHaveBeenLastCalledWith('custom-workflow-agent');
        expect(mockTakeCarriedAgentFor).not.toHaveBeenCalled();
      });

      it('does not register an agent for a saved workflow', async () => {
        const agentBuilder = createMockAgentBuilder();
        await renderEditor(agentBuilder, 'saved-workflow');
        publishOwn(
          agentBuilder,
          { id: undefined, agentId: 'custom-workflow-agent' },
          'workflow-editor:saved-workflow'
        );

        expect(mockSetLastCreateAgentId).not.toHaveBeenCalled();
      });
    });
  });

  describe('attachment sync on mount', () => {
    it('calls setChatConfig and addAttachment when editor is mounted and chat access resolves', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      const expected = expectedAttachment(INITIAL_YAML);
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(expectedChatConfig(expected));
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expected);
    });

    it('propagates the workflow-editor greetingMessage in the chat config', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expect.objectContaining({ greetingMessage: WORKFLOW_EDITOR_GREETING })
      );
    });

    it('does not sync when editor is not mounted', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: false,
        })
      );

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    });

    it('does not sync when agentBuilder is not available', () => {
      setupKibanaMock(undefined);
      const editor = createMockEditor(mockModel);

      expect(() =>
        renderHook(() =>
          useAgentBuilderIntegration({
            editorRef: { current: editor },
            isEditorMounted: true,
          })
        )
      ).not.toThrow();
    });

    it('does not sync when editor ref is null', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: null },
          isEditorMounted: true,
        })
      );

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    });

    it('includes workflowId and workflowName in the attachment', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-123',
          workflowName: 'My Workflow',
        })
      );

      await flushChatAccessCheck();

      const expected = expectedAttachment(INITIAL_YAML, {
        workflowId: 'wf-123',
        name: 'My Workflow',
      });
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expectedChatConfig(expected, 'wf-123')
      );
    });

    it('does not tear down the effect when workflowName changes', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const editorRef = { current: editor } as any;

      const { rerender } = renderHook((props) => useAgentBuilderIntegration(props), {
        initialProps: {
          editorRef,
          isEditorMounted: true,
          workflowName: 'Original Name',
        },
      });

      await flushChatAccessCheck();

      agentBuilder.clearChatConfig.mockClear();
      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      rerender({
        editorRef,
        isEditorMounted: true,
        workflowName: 'Updated Name',
      });

      expect(agentBuilder.clearChatConfig).not.toHaveBeenCalled();

      mockModel.simulateContentChange('name: changed');
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expectedChatConfig(expectedAttachment('name: changed', { name: 'Updated Name' }))
      );
    });

    it('uses the fixed attachment id and a generated session tag on the create route', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTag: `workflow-editor:${MOCK_UUID}`,
          attachments: [expect.objectContaining({ id: ATTACHMENT_ID })],
        })
      );
    });
  });

  describe('attachment sync on content change', () => {
    it('syncs attachment after debounce when content changes', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      const updatedYaml = 'name: updated-workflow';
      mockModel.simulateContentChange(updatedYaml);

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      const expected = expectedAttachment(updatedYaml);
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(expectedChatConfig(expected));
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expected);
    });

    it('debounces rapid content changes', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      mockModel.simulateContentChange('change-1');
      act(() => {
        jest.advanceTimersByTime(200);
      });

      mockModel.simulateContentChange('change-2');
      act(() => {
        jest.advanceTimersByTime(200);
      });

      mockModel.simulateContentChange('change-3');

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(agentBuilder.setChatConfig).toHaveBeenCalledTimes(1);
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expectedChatConfig(expectedAttachment('change-3'))
      );
    });
  });

  describe('cleanup on unmount', () => {
    it('calls clearChatConfig on unmount', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      unmount();

      expect(agentBuilder.clearChatConfig).toHaveBeenCalled();
    });

    it('does not fire pending debounced sync after unmount', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      mockModel.simulateContentChange('pending-change');
      unmount();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
    });
  });

  describe('auto-open on editor mount', () => {
    it('opens the sidebar exactly once on the create route when autoOpenAgentChat is set', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { rerender } = renderHook(
        (props: {
          editorRef: React.MutableRefObject<any>;
          isEditorMounted: boolean;
          workflowName?: string;
          autoOpenAgentChat?: boolean;
        }) => useAgentBuilderIntegration(props),
        {
          initialProps: {
            editorRef: { current: editor },
            isEditorMounted: true,
            workflowName: 'Original Name',
            autoOpenAgentChat: true,
          },
        }
      );

      await flushChatAccessCheck();

      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({ greetingMessage: WORKFLOW_EDITOR_GREETING })
      );

      // Re-render with prop changes must not re-fire the auto-open.
      rerender({
        editorRef: { current: editor },
        isEditorMounted: true,
        workflowName: 'Updated Name',
        autoOpenAgentChat: true,
      });
      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
    });

    it('sends the landing prompt with its attachments next to the workflow YAML', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);
      const imageAttachment = {
        id: 'image-1',
        type: 'image',
        data: { fileId: 'file-1' },
      } as unknown as ConversationAttachment;

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          autoOpenAgentChat: true,
          initialAgentMessage: 'Build a workflow from this screenshot',
          initialAgentAttachments: [imageAttachment],
        })
      );

      await flushChatAccessCheck();

      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
      const { initialMessage, autoSendInitialMessage, attachments } =
        agentBuilder.openChat.mock.calls[0][0];
      expect(initialMessage).toBe('Build a workflow from this screenshot');
      expect(autoSendInitialMessage).toBe(true);
      expect(attachments).toEqual([imageAttachment, expectedAttachment(INITIAL_YAML)]);
    });

    it('does NOT auto-open on the create route without autoOpenAgentChat ("Start manually")', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
    });

    it('does NOT auto-open on an existing workflow detail view', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-1',
        })
      );

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
      expect(mockTelemetry.reportWorkflowAiChatOpened).not.toHaveBeenCalled();
    });

    it('restores the sidebar on mount when the save thunk requested it', async () => {
      // Simulates create → save → detail: save thunk called
      // requestSidebarRestore(workflowId) before navigateToApp, and the
      // remount consumes it here.
      mockConsumeSidebarRestoreFor.mockImplementation((id: string) => id === 'wf-just-saved');
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-just-saved',
        })
      );

      await flushChatAccessCheck();

      expect(mockConsumeSidebarRestoreFor).toHaveBeenCalledWith('wf-just-saved');
      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
    });

    it('does NOT restore when the pending id belongs to a different workflow', () => {
      mockConsumeSidebarRestoreFor.mockImplementation((id: string) => id === 'wf-A');
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-B',
        })
      );

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
    });

    it('does not auto-open when the editor is not yet mounted', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: false,
        })
      );

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
    });

    it('tags chat-opened and session-completed telemetry with autoOpened=true on auto-open', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          autoOpenAgentChat: true,
        })
      );

      await flushChatAccessCheck();

      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledWith({
        entryPoint: 'workflow_editor',
        sessionType: 'create',
        workflowId: undefined,
        autoOpened: true,
      });

      unmount();
      expect(mockTelemetry.reportWorkflowAiSessionCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ autoOpened: true })
      );
    });

    it('does not re-emit chat-opened when the user opens the chat after an auto-open', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          autoOpenAgentChat: true,
        })
      );

      await flushChatAccessCheck();

      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.openAgentChat();
      });

      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledTimes(1);
    });

    it('does not auto-open when no LLM connector is configured', async () => {
      const agentBuilder = createMockAgentBuilder();
      agentBuilder.getAgentBuilderAccess.mockResolvedValue({
        hasRequiredLicense: true,
        hasLlmConnector: false,
      });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
      expect(mockTelemetry.reportWorkflowAiChatOpened).not.toHaveBeenCalled();
    });
  });

  describe('cleanup closes the chat sidebar', () => {
    it('closes the chat sidebar on unmount (leaves the workflow app)', async () => {
      const agentBuilder = createMockAgentBuilder();
      const chatRef = { close: jest.fn() };
      agentBuilder.openChat.mockReturnValue({ chatRef });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          autoOpenAgentChat: true,
        })
      );

      await flushChatAccessCheck();

      // Auto-open path opened the chat; unmount must close it.
      unmount();

      expect(chatRef.close).toHaveBeenCalled();
    });

    it('does NOT close the sidebar when workflowId flips (create → saved detail)', async () => {
      // Repro of the bug the initial fix caused: after Save the sidebar was
      // closing because the effect cleanup ran on workflowId change and
      // called chatRef.close(). The close is now scoped to true unmount.
      const agentBuilder = createMockAgentBuilder();
      const chatRef = { close: jest.fn() };
      agentBuilder.openChat.mockReturnValue({ chatRef });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      interface Props {
        editorRef: React.MutableRefObject<any>;
        isEditorMounted: boolean;
        workflowId?: string;
      }
      const { rerender } = renderHook((props: Props) => useAgentBuilderIntegration(props), {
        initialProps: {
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: undefined,
        } as Props,
      });

      await flushChatAccessCheck();

      // Flip from create (no id) to saved detail (real id). The main effect
      // cleanup+rerun fires; the sidebar close must NOT.
      rerender({
        editorRef: { current: editor },
        isEditorMounted: true,
        workflowId: 'wf-just-saved',
      });

      expect(chatRef.close).not.toHaveBeenCalled();
    });

    it('does NOT close the sidebar when workflowName changes (unrelated dep churn)', async () => {
      const agentBuilder = createMockAgentBuilder();
      const chatRef = { close: jest.fn() };
      agentBuilder.openChat.mockReturnValue({ chatRef });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { rerender } = renderHook(
        (props: {
          editorRef: React.MutableRefObject<any>;
          isEditorMounted: boolean;
          workflowName?: string;
        }) => useAgentBuilderIntegration(props),
        {
          initialProps: {
            editorRef: { current: editor },
            isEditorMounted: true,
            workflowName: 'Old Name',
          },
        }
      );

      await flushChatAccessCheck();

      rerender({
        editorRef: { current: editor },
        isEditorMounted: true,
        workflowName: 'New Name',
      });

      expect(chatRef.close).not.toHaveBeenCalled();
    });
  });

  describe('sidebar-open state tracking', () => {
    it('marks the sidebar open when openChat runs and closed via the onClose callback', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          autoOpenAgentChat: true,
        })
      );

      await flushChatAccessCheck();

      // Auto-open ran → sidebar marked open.
      expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);

      // Simulate the user closing the sidebar from its own chrome — the
      // agent-builder plugin invokes the onClose callback we passed.
      const openChatArgs = agentBuilder.openChat.mock.calls[0][0];
      openChatArgs.onClose();
      expect(mockSetSidebarOpen).toHaveBeenLastCalledWith(false);
    });

    it('marks the sidebar closed on unmount', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      mockSetSidebarOpen.mockClear();
      unmount();
      expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('conversation handoff registration', () => {
    it('registers the unsaved session id when there is no workflowId', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      // The chat session tag is built from this, so it must be the session id
      // and not the (fixed) attachment id.
      expect(mockSetLastCreateSessionId).toHaveBeenCalledWith(MOCK_UUID);
    });

    it('does NOT register or clear the create-attachment when a workflowId is present', () => {
      // The module-level value is single-shot — consumed by
      // carryConversationToWorkflow in the save thunk. Clearing here would
      // race the thunk's carry call after `dispatch(setWorkflow(...))`, since
      // the resulting re-render re-fires this effect with workflowId set.
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-abc',
        })
      );

      expect(mockSetLastCreateSessionId).not.toHaveBeenCalled();
    });
  });

  describe('openAgentChat', () => {
    it('calls openChat with workflow attachment and session tag', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-456',
          workflowName: 'Test Flow',
        })
      );

      await flushChatAccessCheck();

      act(() => {
        result.current.openAgentChat();
      });

      expect(agentBuilder.openChat).toHaveBeenCalledWith({
        sessionTag: 'workflow-editor:wf-456',
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        initialMessage: undefined,
        autoSendInitialMessage: undefined,
        newConversation: undefined,
        attachments: [
          expectedAttachment(INITIAL_YAML, { workflowId: 'wf-456', name: 'Test Flow' }),
        ],
        onClose: expect.any(Function),
      });
    });

    it('passes initialMessage and autoSendInitialMessage options', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      act(() => {
        result.current.openAgentChat({
          initialMessage: 'Fix this workflow',
          autoSendInitialMessage: true,
          newConversation: true,
        });
      });

      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMessage: 'Fix this workflow',
          autoSendInitialMessage: true,
          newConversation: true,
        })
      );
    });

    it('attaches the current workflow YAML when a new conversation replaces a persisted one', async () => {
      const agentBuilder = createMockAgentBuilder();
      mockHasPersistedConversation.mockReturnValue(true);
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-456',
          workflowName: 'Test Flow',
        })
      );

      await flushChatAccessCheck();

      act(() => {
        result.current.openAgentChat({
          initialMessage: 'Fix this workflow',
          newConversation: true,
        });
      });

      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          newConversation: true,
          attachments: [
            expectedAttachment(INITIAL_YAML, { workflowId: 'wf-456', name: 'Test Flow' }),
          ],
        })
      );
    });

    it('does not call openChat when agentBuilder is not available', () => {
      setupKibanaMock(undefined);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      act(() => {
        result.current.openAgentChat();
      });

      // No error thrown
    });

    it('includes validation errors as clientDiagnostics', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const validationErrors = [
        {
          id: 'err-1',
          severity: 'error' as const,
          message: 'Invalid step',
          owner: 'yaml' as const,
          ruleId: 'schemaViolation' as const,
          hoverMessage: null,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 10,
        },
        {
          id: 'err-2',
          severity: 'warning' as const,
          message: 'Missing field',
          owner: 'variable-validation' as const,
          ruleId: 'invalidVariableReference' as const,
          hoverMessage: null,
          startLineNumber: 2,
          startColumn: 1,
          endLineNumber: 2,
          endColumn: 15,
        },
      ];

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          validationErrors,
        })
      );

      await flushChatAccessCheck();

      act(() => {
        result.current.openAgentChat();
      });

      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              data: expect.objectContaining({
                clientDiagnostics: [
                  { severity: 'error', message: 'Invalid step', source: 'yaml' },
                  { severity: 'warning', message: 'Missing field', source: 'variable-validation' },
                ],
              }),
            }),
          ],
        })
      );
    });
  });

  describe('isAgentBuilderAvailable', () => {
    it('returns true when agentBuilder is available', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isAgentBuilderAvailable).toBe(true);
      });
    });

    it('returns false when no LLM connector is configured', async () => {
      const agentBuilder = createMockAgentBuilder();
      agentBuilder.getAgentBuilderAccess.mockResolvedValue({
        hasRequiredLicense: true,
        hasLlmConnector: false,
      });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(result.current.isAgentBuilderAvailable).toBe(false);
    });

    it('returns false when show privilege is missing', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder, { hasShowPrivilege: false });
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(result.current.isAgentBuilderAvailable).toBe(false);
    });

    it('returns false when enterprise license is missing', async () => {
      const agentBuilder = createMockAgentBuilder();
      agentBuilder.getAgentBuilderAccess.mockResolvedValue({
        hasRequiredLicense: false,
        hasLlmConnector: true,
      });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(result.current.isAgentBuilderAvailable).toBe(false);
    });

    it('returns false when agentBuilder is not available', () => {
      setupKibanaMock(undefined);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(result.current.isAgentBuilderAvailable).toBe(false);
    });
  });

  describe('no advanced-setting gate', () => {
    it('wires up attachment sync, chat config and auto-open on a default deployment', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          autoOpenAgentChat: true,
        })
      );

      await flushChatAccessCheck();

      const expected = expectedAttachment(INITIAL_YAML);
      expect(result.current.isAgentBuilderAvailable).toBe(true);
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expected);
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(expectedChatConfig(expected));
      expect(agentBuilder.openChat).toHaveBeenCalled();
    });

    it('never reads a ui setting', async () => {
      setupKibanaMock(createMockAgentBuilder());
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      expect(useUiSettingMock).not.toHaveBeenCalled();
    });
  });

  describe('proposal telemetry conversation id', () => {
    const getOnProposalReceived = () => {
      const bridge = mockAttachmentBridge.mock.results.at(-1)?.value;
      return bridge.start.mock.calls.at(-1)[3].onProposalReceived;
    };

    it('reports the conversation id on a resumed conversation', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: createMockEditor(mockModel) },
          isEditorMounted: true,
        })
      );

      await flushChatAccessCheck();

      act(() => {
        agentBuilder.events.ui.activeConversation$.next({ id: 'conv-resumed' });
      });

      getOnProposalReceived()({ proposalId: 'proposal-1', toolId: 'edit-tool' });

      expect(mockTelemetry.reportAiProposalReceived).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-resumed', proposalId: 'proposal-1' })
      );
    });
  });

  describe('attachment linking across the first save', () => {
    // The editor's own attachment id changes on save, so syncing under it adds
    // a second workflow.yaml attachment to the same conversation.
    const DRAFT_ID = 'draft-uuid';

    const workflowAttachment = (id: string, origin?: string): VersionedAttachment => ({
      id,
      type: WORKFLOW_YAML_ATTACHMENT_TYPE,
      versions: [],
      current_version: 1,
      origin,
    });

    const activeConversation = (attachments?: VersionedAttachment[]) =>
      ({
        id: 'conv-1',
        ...(attachments ? { conversation: { attachments } } : {}),
      } as ActiveConversation);

    const renderSavedEditor = async (agentBuilder: ReturnType<typeof createMockAgentBuilder>) => {
      setupKibanaMock(agentBuilder);
      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: createMockEditor(mockModel) },
          isEditorMounted: true,
          workflowId: 'workflow-a',
        })
      );
      await flushChatAccessCheck();
    };

    it('adds nothing until a restored conversation reveals its attachment', async () => {
      // The sidebar restores this session's last conversation on open, so the
      // editor cannot know its attachment id at mount.
      const agentBuilder = createMockAgentBuilder();
      mockHasPersistedConversation.mockReturnValue(true);
      await renderSavedEditor(agentBuilder);

      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();

      act(() => {
        agentBuilder.events.ui.activeConversation$.next(
          activeConversation([workflowAttachment(DRAFT_ID, 'workflow-a')])
        );
      });

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: DRAFT_ID })
      );
    });

    it('opens the chat without an attachment while a restored conversation loads', async () => {
      const agentBuilder = createMockAgentBuilder();
      mockHasPersistedConversation.mockReturnValue(true);
      setupKibanaMock(agentBuilder);
      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: createMockEditor(mockModel) },
          isEditorMounted: true,
          workflowId: 'workflow-a',
        })
      );
      await flushChatAccessCheck();

      act(() => result.current.openAgentChat());

      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({ attachments: [] })
      );
    });

    it('uses the fixed id for the very first sync after a save', async () => {
      // The editor pushes an attachment at mount, before the conversation
      // loads, so the id has to hold without consulting the conversation.
      const agentBuilder = createMockAgentBuilder();
      await renderSavedEditor(agentBuilder);

      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: ATTACHMENT_ID })
      );
      // The session tag still keys off the workflow, so the handoff holds.
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expect.objectContaining({ sessionTag: 'workflow-editor:workflow-a' })
      );
    });

    it('holds the sync until a bound conversation has loaded', async () => {
      const agentBuilder = createMockAgentBuilder();
      agentBuilder.events.ui.activeConversation$.next(activeConversation());
      await renderSavedEditor(agentBuilder);

      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();

      act(() => {
        agentBuilder.events.ui.activeConversation$.next(
          activeConversation([workflowAttachment(DRAFT_ID, 'workflow-a')])
        );
      });

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: DRAFT_ID })
      );
    });

    it('reuses the draft attachment id when the conversation links it to this workflow', async () => {
      const agentBuilder = createMockAgentBuilder();
      await renderSavedEditor(agentBuilder);

      act(() => {
        agentBuilder.events.ui.activeConversation$.next(
          activeConversation([workflowAttachment(DRAFT_ID, 'workflow-a')])
        );
      });

      agentBuilder.addAttachment.mockClear();
      act(() => {
        mockModel.simulateContentChange('name: edited');
        jest.advanceTimersByTime(1000);
      });

      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: DRAFT_ID })
      );
    });

    it('links the create session attachment to the workflow after the first save', async () => {
      const agentBuilder = createMockAgentBuilder();
      await renderSavedEditor(agentBuilder);

      act(() => {
        // Added while the workflow was still unsaved, so it has no origin yet.
        agentBuilder.events.ui.activeConversation$.next(
          activeConversation([workflowAttachment(ATTACHMENT_ID)])
        );
      });

      expect(agentBuilder.updateAttachmentOrigin).toHaveBeenCalledWith(
        'conv-1',
        ATTACHMENT_ID,
        'workflow-a'
      );
    });

    it('does not re-link an attachment whose origin is already set', async () => {
      const agentBuilder = createMockAgentBuilder();
      await renderSavedEditor(agentBuilder);

      act(() => {
        agentBuilder.events.ui.activeConversation$.next(
          activeConversation([workflowAttachment(DRAFT_ID, 'workflow-a')])
        );
      });

      expect(agentBuilder.updateAttachmentOrigin).not.toHaveBeenCalled();
    });

    it('keeps its own attachment id when the conversation holds none', async () => {
      const agentBuilder = createMockAgentBuilder();
      await renderSavedEditor(agentBuilder);

      act(() => {
        agentBuilder.events.ui.activeConversation$.next(activeConversation([]));
      });

      agentBuilder.addAttachment.mockClear();
      act(() => {
        mockModel.simulateContentChange('name: edited');
        jest.advanceTimersByTime(1000);
      });

      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: ATTACHMENT_ID, origin: 'workflow-a' })
      );
    });
  });

  describe('read-only editor', () => {
    it('sends the read-only reason and re-syncs it when the reason changes', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };

      const { rerender } = renderHook((props) => useAgentBuilderIntegration(props), {
        initialProps: {
          editorRef,
          isEditorMounted: true,
          workflowId: 'workflow-a',
          readOnlyReason: 'executions_tab' as const,
        } as Parameters<typeof useAgentBuilderIntegration>[0],
      });
      await flushChatAccessCheck();

      expect(agentBuilder.addAttachment).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ readOnlyReason: 'executions_tab' }),
        })
      );

      agentBuilder.addAttachment.mockClear();
      rerender({
        editorRef,
        isEditorMounted: true,
        workflowId: 'workflow-a',
        readOnlyReason: undefined,
      });

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
      expect(agentBuilder.addAttachment.mock.calls[0][0].data.readOnlyReason).toBeUndefined();
    });

    it('holds proposals while it cannot apply them and shows them once it can', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };

      const onProposalDeferred = jest.fn();
      const { rerender } = renderHook((props) => useAgentBuilderIntegration(props), {
        initialProps: {
          editorRef,
          isEditorMounted: true,
          workflowId: 'workflow-a',
          canApplyProposals: false,
          onProposalDeferred,
        },
      });
      await flushChatAccessCheck();

      const bridge = mockAttachmentBridge.mock.results.at(-1)?.value;
      const startOptions = bridge.start.mock.calls[0][3];
      expect(startOptions.isReadOnly()).toBe(true);

      startOptions.onProposalDeferred();
      expect(onProposalDeferred).toHaveBeenCalledTimes(1);
      expect(bridge.applyDeferred).not.toHaveBeenCalled();

      rerender({
        editorRef,
        isEditorMounted: true,
        workflowId: 'workflow-a',
        canApplyProposals: true,
        onProposalDeferred,
      });

      expect(startOptions.isReadOnly()).toBe(false);
      expect(bridge.applyDeferred).toHaveBeenCalledTimes(1);
    });

    it('sends the Workflow tab YAML while the user is on the Executions tab', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };

      const { rerender } = renderHook((props) => useAgentBuilderIntegration(props), {
        initialProps: {
          editorRef,
          isEditorMounted: true,
          workflowId: 'workflow-a',
          readOnlyReason: 'executions_tab',
          workflowTabYaml: 'name: current',
        } as Parameters<typeof useAgentBuilderIntegration>[0],
      });
      await flushChatAccessCheck();

      expect(agentBuilder.addAttachment).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ yaml: 'name: current' }),
        })
      );

      agentBuilder.addAttachment.mockClear();
      rerender({
        editorRef,
        isEditorMounted: true,
        workflowId: 'workflow-a',
        workflowTabYaml: 'name: current',
      });

      expect(agentBuilder.addAttachment.mock.calls[0][0].data.yaml).toBe(INITIAL_YAML);
    });

    it('waits for the editor to show the workflow YAML before it shows a held proposal', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      const baseProps = { editorRef, isEditorMounted: true, workflowId: 'workflow-a' };

      const { rerender } = renderHook((props) => useAgentBuilderIntegration(props), {
        initialProps: { ...baseProps, canApplyProposals: false, workflowTabYaml: 'name: workflow' },
      });
      await flushChatAccessCheck();
      const bridge = mockAttachmentBridge.mock.results.at(-1)?.value;

      // The editor model still holds the execution YAML for one render.
      rerender({ ...baseProps, canApplyProposals: true, workflowTabYaml: 'name: workflow' });
      expect(bridge.applyDeferred).not.toHaveBeenCalled();

      act(() => {
        mockModel.simulateContentChange('name: workflow');
      });
      // Not inside the editor's value write, where `onChange` is muted.
      expect(bridge.applyDeferred).not.toHaveBeenCalled();

      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(bridge.applyDeferred).toHaveBeenCalledTimes(1);
    });

    it('suspends pending proposals while it cannot apply them and resumes them after', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editorRef = { current: createMockEditor(mockModel) };
      const baseProps = { editorRef, isEditorMounted: true, workflowId: 'workflow-a' };

      const { rerender } = renderHook((props) => useAgentBuilderIntegration(props), {
        initialProps: { ...baseProps, canApplyProposals: true },
      });
      await flushChatAccessCheck();
      const manager = mockProposalManager.mock.results.at(-1)?.value;
      const bridge = mockAttachmentBridge.mock.results.at(-1)?.value;
      bridge.hasDeferred.mockReturnValue(false);

      rerender({ ...baseProps, canApplyProposals: false });
      expect(manager.suspend).toHaveBeenCalledTimes(1);

      manager.hasSuspendedProposals.mockReturnValue(true);
      rerender({ ...baseProps, canApplyProposals: true });
      expect(manager.resume).toHaveBeenCalledTimes(1);
    });

    it('does not send diagnostics of the past run with the Workflow tab YAML', async () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: createMockEditor(mockModel) },
          isEditorMounted: true,
          workflowId: 'workflow-a',
          readOnlyReason: 'executions_tab',
          workflowTabYaml: 'name: current',
          validationErrors: [
            {
              id: 'schema-1',
              owner: 'yaml',
              ruleId: 'schemaViolation',
              severity: 'error',
              message: 'Error in the past run',
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 2,
              hoverMessage: null,
            },
          ],
        })
      );
      await flushChatAccessCheck();

      expect(agentBuilder.addAttachment).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ yaml: 'name: current', clientDiagnostics: undefined }),
        })
      );
    });
  });
});
