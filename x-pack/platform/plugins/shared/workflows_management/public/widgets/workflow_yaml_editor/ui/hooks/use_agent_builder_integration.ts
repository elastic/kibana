/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux-v7';
import { v4 } from 'uuid';
import type { ActiveConversation } from '@kbn/agent-builder-browser';
import type {
  ConversationAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  type WorkflowEditorReadOnlyReason,
} from '@kbn/workflows/common/constants';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { setAiAssisted } from '../../../../entities/workflows/store/workflow_detail/slice';
import {
  AttachmentBridge,
  consumeSidebarRestoreFor,
  findLinkedWorkflowAttachment,
  getWorkflowEditorSessionTag,
  hasPersistedConversation,
  isWorkflowEditorSessionTag,
  ProposalManager,
  setActiveProposalManager,
  setLastCreateAgentId,
  setLastCreateSessionId,
  setSidebarOpen,
  takeCarriedAgentFor,
  WORKFLOW_EDITOR_ATTACHMENT_ID,
} from '../../../../features/ai_integration';
import { ProposalTracker } from '../../../../features/ai_integration/proposal_tracker';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTelemetry } from '../../../../hooks/use_telemetry';

interface UseAgentBuilderIntegrationParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  isEditorMounted?: boolean;
  workflowId?: string;
  workflowName?: string;
  validationErrors?: YamlValidationResult[] | null;
  /** Why the editor cannot apply changes; undefined when the user can edit. */
  readOnlyReason?: WorkflowEditorReadOnlyReason;
  /**
   * False while the editor cannot take agent proposals. Proposals wait until
   * it turns true. Defaults to true.
   */
  canApplyProposals?: boolean;
  /** Called when a proposal arrives while `canApplyProposals` is false. */
  onProposalDeferred?: () => void;
  /**
   * YAML of the Workflow tab. On the Executions tab the agent gets it instead of
   * the past run's YAML, because proposals apply there. Held proposals wait
   * until the editor shows it.
   */
  workflowTabYaml?: string;
  /** Prompt from the agentic-first landing, sent when the chat auto-opens. */
  initialAgentMessage?: string;
  /** Attachments of that prompt (e.g. pasted images), added when the chat auto-opens. */
  initialAgentAttachments?: ConversationAttachment[];
  /**
   * Opens the sidebar on mount for an unsaved workflow. Set when the user
   * chose AI on the landing or remixed a library template.
   */
  autoOpenAgentChat?: boolean;
}

export interface OpenAgentChatOptions {
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
  /**
   * Required for `initialMessage` to take effect: Agent Builder ignores
   * initial messages when restoring a persisted conversation.
   */
  newConversation?: boolean;
  // Internal: auto-open path from the mount effect. Tags the chat-opened /
  // session-completed events with `autoOpened: true` so analysts can filter
  // out non-deliberate opens when measuring engagement.
  isAutoOpen?: boolean;
  /** Added to the chat next to the workflow attachment. */
  attachments?: ConversationAttachment[];
}

interface UseAgentBuilderIntegrationReturn {
  openAgentChat: (options?: OpenAgentChatOptions) => void;
  isAgentBuilderAvailable: boolean;
  proposalManager: ProposalManager | null;
}

const ATTACHMENT_SYNC_DEBOUNCE_TIME = 500;

const WORKFLOW_EDITOR_GREETING = i18n.translate('workflows.agentBuilder.workflowEditorGreeting', {
  defaultMessage: 'What do you want to automate?',
});

export const useAgentBuilderIntegration = ({
  editorRef,
  isEditorMounted,
  workflowId,
  workflowName,
  validationErrors,
  readOnlyReason,
  canApplyProposals = true,
  onProposalDeferred,
  workflowTabYaml,
  initialAgentMessage,
  initialAgentAttachments,
  autoOpenAgentChat = false,
}: UseAgentBuilderIntegrationParams): UseAgentBuilderIntegrationReturn => {
  const { workflowsManagement, application } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const hasShowPrivilege = application.capabilities.agentBuilder?.show === true;
  const telemetry = useTelemetry();
  const dispatch = useDispatch();
  const proposalManagerRef = useRef<ProposalManager | null>(null);
  const attachmentBridgeRef = useRef<AttachmentBridge | null>(null);
  const trackerRef = useRef<ProposalTracker | null>(null);
  const chatOpenedReportedRef = useRef(false);
  const sessionAutoOpenedRef = useRef(false);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const hasSeenAgentRef = useRef(false);
  const selectedAgentIdRef = useRef<string | undefined>(undefined);
  const newAgentConversationRef = useRef<true | undefined>(undefined);
  // Whether the config the sidebar reopens with still asks for a new conversation.
  const savedNewConversationRef = useRef(false);
  const syncAttachmentIdRef = useRef<string | undefined>(undefined);
  const attachmentTargetResolvedRef = useRef(true);
  const validationErrorsRef = useRef(validationErrors);
  validationErrorsRef.current = validationErrors;
  const readOnlyReasonRef = useRef(readOnlyReason);
  readOnlyReasonRef.current = readOnlyReason;
  const syncAttachmentRef = useRef<((yaml: string) => void) | null>(null);
  const canApplyProposalsRef = useRef(canApplyProposals);
  canApplyProposalsRef.current = canApplyProposals;
  const onProposalDeferredRef = useRef(onProposalDeferred);
  onProposalDeferredRef.current = onProposalDeferred;
  const executionsTabYaml = readOnlyReason === 'executions_tab' ? workflowTabYaml : undefined;
  const executionsTabYamlRef = useRef(executionsTabYaml);
  executionsTabYamlRef.current = executionsTabYaml;
  const chatRefHandle = useRef<{ close: () => void } | null>(null);
  const hasAutoOpenedRef = useRef(false);
  const unsavedWorkflowIdRef = useRef<string>(v4());
  const workflowNameRef = useRef(workflowName);
  workflowNameRef.current = workflowName;
  const [isChatAccessible, setIsChatAccessible] = useState(false);

  // Drives the chat session tag, which `carryConversationToWorkflow` rewrites
  // onto the saved workflow across the first save.
  const sessionId = workflowId ?? unsavedWorkflowIdRef.current;
  const chatSessionTag = getWorkflowEditorSessionTag(sessionId);

  // Fixed, so saving a new workflow cannot move the attachment the conversation
  // is already writing into.
  const attachmentId = WORKFLOW_EDITOR_ATTACHMENT_ID;

  useEffect(() => {
    if (!agentBuilder || !hasShowPrivilege) {
      setIsChatAccessible(false);
      return;
    }

    let cancelled = false;

    void agentBuilder
      .getAgentBuilderAccess()
      .then((access) => {
        if (!cancelled) {
          setIsChatAccessible(access.hasRequiredLicense && access.hasLlmConnector);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsChatAccessible(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentBuilder, hasShowPrivilege]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!isEditorMounted || !editor || !agentBuilder || !hasShowPrivilege || !isChatAccessible) {
      return;
    }

    // The first save remounts the editor. The chat it carried over stays under the agent
    // the create route had selected, so keep using that agent to find it.
    if (workflowId && !hasSeenAgentRef.current) {
      const carriedAgentId = takeCarriedAgentFor(workflowId);
      if (carriedAgentId) selectedAgentIdRef.current = carriedAgentId;
    }

    const tracker = new ProposalTracker();
    trackerRef.current = tracker;

    const sessionType = workflowId ? 'edit' : 'create';

    const manager = new ProposalManager();
    manager.initialize(editor, {
      onHunkAccepted: () => {
        dispatch(setAiAssisted(true));
        const pending = tracker.getAllRecords().find((r) => r.status === 'pending');
        if (pending) {
          tracker.updateStatus(pending.proposalId, 'accepted');
          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: pending.proposalId,
            resolution: 'accepted',
            toolId: pending.toolId,
            isBulkAction: false,
          });
        }
      },
      onHunkRejected: () => {
        const pending = tracker.getAllRecords().find((r) => r.status === 'pending');
        if (pending) {
          tracker.cascadeDecline(pending.proposalId);
          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: pending.proposalId,
            resolution: 'rejected',
            toolId: pending.toolId,
            isBulkAction: false,
          });
        }
      },
      onAccept: ({ isBulkAction }) => {
        const pendingRecords = tracker.getAllRecords().filter((r) => r.status === 'pending');

        if (pendingRecords.length > 0) {
          dispatch(setAiAssisted(true));
        }

        for (const record of pendingRecords) {
          tracker.updateStatus(record.proposalId, 'accepted');

          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: record.proposalId,
            resolution: 'accepted',
            toolId: record.toolId,
            isBulkAction,
          });
        }
      },
      onReject: ({ isBulkAction }) => {
        const pendingRecords = tracker.getAllRecords().filter((r) => r.status === 'pending');

        for (const record of pendingRecords) {
          tracker.cascadeDecline(record.proposalId);

          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: record.proposalId,
            resolution: 'rejected',
            toolId: record.toolId,
            isBulkAction,
          });
        }
      },
    });

    proposalManagerRef.current = manager;
    setActiveProposalManager(manager);

    // Only set on the create route — the value is consumed by
    // `carryConversationToWorkflow` in the save thunk. Clearing here on
    // workflowId presence would race that consume after setWorkflow re-fires
    // this effect.
    if (!workflowId) {
      setLastCreateSessionId(sessionId);
      setLastCreateAgentId(selectedAgentIdRef.current);
    }

    const bridge = new AttachmentBridge();
    bridge.start(manager, editorRef, tracker, {
      activeConversation$: agentBuilder.events.ui.activeConversation$,
      getChatEvents$: agentBuilder.events.getChatEvents$.bind(agentBuilder.events),
      attachmentId,
      workflowId,
      isReadOnly: () => !canApplyProposalsRef.current,
      onProposalDeferred: () => onProposalDeferredRef.current?.(),
      onProposalReceived: ({ proposalId, toolId }) => {
        telemetry.reportAiProposalReceived({
          workflowId,
          conversationId: conversationIdRef.current,
          proposalId,
          toolId,
          sessionType,
        });
      },
    });
    attachmentBridgeRef.current = bridge;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__wfTestBridge = {
      injectYamlChange: (afterYaml: string) => bridge.injectYamlChange(afterYaml),
      getEditorValue: () => editorRef.current?.getModel()?.getValue() ?? '',
      revealNextProposal: () => {
        const hunks = manager.getDiffHunks();
        if (hunks.length > 0 && editorRef.current) {
          editorRef.current.setPosition({ lineNumber: hunks[0].modifiedStartLine, column: 1 });
          editorRef.current.revealLineInCenter(hunks[0].modifiedStartLine);
        }
      },
    };

    const buildAttachment = (editorYaml: string) =>
      buildWorkflowAttachment({
        yaml: executionsTabYamlRef.current ?? editorYaml,
        attachmentId: syncAttachmentIdRef.current ?? attachmentId,
        workflowId,
        workflowName: workflowNameRef.current,
        // Editor diagnostics describe the past run's YAML, not the one sent here.
        diagnostics:
          executionsTabYamlRef.current === undefined
            ? serializeClientDiagnostics(validationErrorsRef.current)
            : undefined,
        readOnlyReason: readOnlyReasonRef.current,
      });

    const unsubAllResolved = tracker.onAllResolved(() => {
      const yaml = editorRef.current?.getModel()?.getValue();
      if (yaml) {
        agentBuilder.addAttachment(buildAttachment(yaml));
      }
    });

    // Sets what the sidebar reopens with. An open sidebar takes it as its props, replacing
    // whatever it was opened with.
    const publishChatConfig = (attachments?: ConversationAttachment[]) => {
      savedNewConversationRef.current = newAgentConversationRef.current === true;
      agentBuilder.setChatConfig({
        agentId: selectedAgentIdRef.current,
        newConversation: newAgentConversationRef.current,
        sessionTag: chatSessionTag,
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        attachments,
      });
    };

    // The conversation the saved config points at is still loading, and reopening the
    // sidebar meanwhile must not start a new chat in its place.
    const releaseSavedNewConversation = () => {
      if (savedNewConversationRef.current) publishChatConfig();
    };

    // A chat of another surface, such as "Diagnose with AI", has the sidebar. Its props are not
    // the editor's to replace, so syncs wait until the sidebar is the editor's again.
    let isOtherChatBound = false;
    let syncDeferred = false;

    const syncAttachment = (yaml: string, { keepOpenOptions = false } = {}) => {
      if (!attachmentTargetResolvedRef.current) return;
      if (isOtherChatBound) {
        syncDeferred = true;
        return;
      }
      syncDeferred = false;
      const attachment = buildAttachment(yaml);
      // A chat that has only just mounted may not have used its open options yet, such as the
      // prompt "Fix with AI" prefills, and publishing the config would replace them.
      if (!keepOpenOptions) publishChatConfig([attachment]);
      agentBuilder.addAttachment(attachment);
    };
    syncAttachmentRef.current = syncAttachment;

    // Brings the attachment of the editor chat up to date with edits made while another chat
    // held the sidebar. The chat may have just mounted, so its open options stay as they are.
    const runDeferredSync = () => {
      if (!syncDeferred) return;
      const yaml = editor.getModel()?.getValue();
      if (yaml !== undefined) syncAttachment(yaml, { keepOpenOptions: true });
    };

    // The sidebar restores this session's last conversation, which may already
    // hold the attachment to write into. Adding one before it loads makes a
    // second.
    attachmentTargetResolvedRef.current = !hasPersistedConversation(sessionId);
    let originLinkRequested = false;

    const updateAgentSelection = (binding: ActiveConversation): boolean => {
      const agentId = 'agentId' in binding ? binding.agentId : selectedAgentIdRef.current;
      const agentChanged = hasSeenAgentRef.current && agentId !== selectedAgentIdRef.current;
      hasSeenAgentRef.current = true;
      selectedAgentIdRef.current = agentId;
      if (!workflowId) setLastCreateAgentId(agentId);
      return agentChanged;
    };

    const resetAttachmentTarget = () => {
      const previousAttachmentId = syncAttachmentIdRef.current;
      if (previousAttachmentId && previousAttachmentId !== attachmentId) {
        agentBuilder.removeAttachment(previousAttachmentId);
      }
      syncAttachmentIdRef.current = undefined;
      bridge.setAttachmentId(attachmentId);
      originLinkRequested = false;
    };

    const linkAttachmentOrigin = (
      conversationId: string | undefined,
      linked: VersionedAttachment | undefined
    ) => {
      if (!conversationId || !workflowId || originLinkRequested) return;
      if (!linked || linked.origin === workflowId) return;
      originLinkRequested = true;
      void agentBuilder.updateAttachmentOrigin(conversationId, linked.id, workflowId).catch(() => {
        originLinkRequested = false;
      });
    };

    // The chat UI publishes the conversation for every surface it renders, and a new
    // conversation is created before its id is bound, so this covers new and resumed
    // conversations alike.
    let isChatJustMounted = true;
    const activeConversationSub = agentBuilder.events.ui.activeConversation$.subscribe(
      (activeConversation) => {
        // `null` means no chat surface is bound, which says nothing about the
        // conversation the sidebar will restore. Whatever binds next is mounted anew.
        if (!activeConversation) {
          isChatJustMounted = true;
          isOtherChatBound = false;
          return;
        }
        // Other chat surfaces, such as "Diagnose with AI", publish here too. Syncing the
        // editor into them would replace their session tag, prompt and attachments.
        const { sessionTag } = activeConversation;
        if (isOtherChatSurface(sessionTag)) {
          isOtherChatBound = true;
          return;
        }
        isOtherChatBound = false;
        const keepOpenOptions = isChatJustMounted && sessionTag === chatSessionTag;
        isChatJustMounted = false;

        const agentChanged = updateAgentSelection(activeConversation);
        const conversationChanged = activeConversation.id !== conversationIdRef.current;
        const bindingChanged = agentChanged || conversationChanged;
        conversationIdRef.current = activeConversation.id;
        if (activeConversation.id) {
          newAgentConversationRef.current = undefined;
        } else if (agentChanged) {
          // Keep the agent selector's new-chat intent until this chat receives an id.
          newAgentConversationRef.current = true;
        }

        if (bindingChanged) {
          // Attachment ids belong to a conversation; a new chat starts with the editor id.
          resetAttachmentTarget();
        }

        if (activeConversation.id && !activeConversation.conversation) {
          attachmentTargetResolvedRef.current = false;
          releaseSavedNewConversation();
          return;
        }

        const linked = findLinkedWorkflowAttachment({
          attachments: activeConversation.conversation?.attachments,
          attachmentId,
          workflowId,
        });
        const previousAttachmentId = syncAttachmentIdRef.current ?? attachmentId;
        const linkedAttachmentChanged = linked !== undefined && linked.id !== previousAttachmentId;
        if (linked) {
          if (linkedAttachmentChanged) {
            agentBuilder.removeAttachment(previousAttachmentId);
          }
          syncAttachmentIdRef.current = linked.id;
          bridge.setAttachmentId(linked.id);
        }

        if (!attachmentTargetResolvedRef.current || linkedAttachmentChanged || bindingChanged) {
          attachmentTargetResolvedRef.current = true;
          const yaml = editor.getModel()?.getValue();
          if (yaml !== undefined) syncAttachment(yaml, { keepOpenOptions });
        }
        runDeferredSync();

        // A create-session attachment predates the workflow, so nothing has
        // pointed it at one yet.
        linkAttachmentOrigin(activeConversation.id, linked);
      }
    );

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let modelListener: monaco.IDisposable | null = null;
    const model = editor.getModel();
    if (model) {
      syncAttachment(model.getValue());

      modelListener = model.onDidChangeContent(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          syncAttachment(model.getValue());
        }, ATTACHMENT_SYNC_DEBOUNCE_TIME);
      });
    }

    return () => {
      if (chatOpenedReportedRef.current) {
        const records = tracker.getAllRecords();
        telemetry.reportWorkflowAiSessionCompleted({
          sessionType,
          workflowId,
          conversationId: conversationIdRef.current,
          proposalsAccepted: records.filter((r) => r.status === 'accepted').length,
          proposalsDeclined: records.filter((r) => r.status === 'declined').length,
          proposalsPending: records.filter((r) => r.status === 'pending').length,
          autoOpened: sessionAutoOpenedRef.current,
        });
      }
      chatOpenedReportedRef.current = false;
      sessionAutoOpenedRef.current = false;
      conversationIdRef.current = undefined;
      syncAttachmentIdRef.current = undefined;
      attachmentTargetResolvedRef.current = true;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      modelListener?.dispose();
      syncAttachmentRef.current = null;
      activeConversationSub.unsubscribe();
      // Don't close the sidebar here — this runs on every deps change
      // (including the workflowId flip after Save). Close lives in the
      // unmount-only effect below.
      bridge.stop();
      attachmentBridgeRef.current = null;
      setActiveProposalManager(null);
      manager.dispose();
      proposalManagerRef.current = null;
      unsubAllResolved();
      tracker.clearAll();
      trackerRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__wfTestBridge;
    };
  }, [
    isEditorMounted,
    editorRef,
    agentBuilder,
    hasShowPrivilege,
    isChatAccessible,
    attachmentId,
    sessionId,
    chatSessionTag,
    workflowId,
    telemetry,
    dispatch,
  ]);

  // Proposals are diffed against the editor content, so they pause while the
  // editor shows a past execution and come back with the Workflow tab YAML.
  useEffect(() => {
    const bridge = attachmentBridgeRef.current;
    const manager = proposalManagerRef.current;
    const model = editorRef.current?.getModel();
    if (!bridge || !manager || !model) return;

    if (!canApplyProposals) {
      manager.suspend();
      return;
    }
    if (!bridge.hasDeferred() && !manager.hasSuspendedProposals()) return;

    const showProposals = () => {
      manager.resume();
      bridge.applyDeferred();
    };
    if (workflowTabYaml === undefined || model.getValue() === workflowTabYaml) {
      showProposals();
      return;
    }
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    const listener = model.onDidChangeContent(() => {
      if (model.getValue() !== workflowTabYaml) return;
      listener.dispose();
      // Editing the model inside its own change event is a nested edit, and the
      // code editor mutes `onChange` during its value write. Apply after the event.
      showTimer = setTimeout(showProposals);
    });
    return () => {
      listener.dispose();
      clearTimeout(showTimer);
    };
  }, [canApplyProposals, workflowTabYaml, editorRef]);

  const openAgentChat = useCallback(
    (options: OpenAgentChatOptions = {}) => {
      if (!agentBuilder || !isChatAccessible) {
        return;
      }

      if (options.newConversation !== undefined) {
        newAgentConversationRef.current = options.newConversation ? true : undefined;
      }

      const currentYaml = executionsTabYaml ?? editorRef.current?.getModel()?.getValue() ?? '';
      // A new conversation has no restored attachment to wait for, so attach the YAML now.
      // Otherwise the active-conversation subscription adds it once it knows which
      // conversation this session shares.
      const shouldAttachNow =
        attachmentTargetResolvedRef.current || options.newConversation === true;

      const { chatRef } = agentBuilder.openChat({
        agentId: selectedAgentIdRef.current,
        sessionTag: chatSessionTag,
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        initialMessage: options.initialMessage,
        autoSendInitialMessage: options.autoSendInitialMessage,
        newConversation: options.newConversation ?? newAgentConversationRef.current,
        attachments: [
          ...(options.attachments ?? []),
          ...(shouldAttachNow
            ? [
                buildWorkflowAttachment({
                  yaml: currentYaml,
                  attachmentId: syncAttachmentIdRef.current ?? attachmentId,
                  workflowId,
                  workflowName,
                  diagnostics:
                    executionsTabYaml === undefined
                      ? serializeClientDiagnostics(validationErrors)
                      : undefined,
                  readOnlyReason,
                }),
              ]
            : []),
        ],
        onClose: () => setSidebarOpen(false),
      });
      chatRefHandle.current = chatRef;
      setSidebarOpen(true);

      if (!chatOpenedReportedRef.current) {
        sessionAutoOpenedRef.current = options.isAutoOpen === true;
        telemetry.reportWorkflowAiChatOpened({
          entryPoint: 'workflow_editor',
          sessionType: workflowId ? 'edit' : 'create',
          workflowId,
          autoOpened: sessionAutoOpenedRef.current,
        });
        chatOpenedReportedRef.current = true;
      }
    },
    [
      agentBuilder,
      isChatAccessible,
      editorRef,
      attachmentId,
      chatSessionTag,
      workflowId,
      workflowName,
      validationErrors,
      readOnlyReason,
      executionsTabYaml,
      telemetry,
    ]
  );

  // The model listener misses changes that leave the editor content as is, such
  // as a tab switch. Re-sync so the agent sees the current state.
  const isFirstStateSyncRef = useRef(true);
  useEffect(() => {
    if (isFirstStateSyncRef.current) {
      isFirstStateSyncRef.current = false;
      return;
    }
    const yaml = editorRef.current?.getModel()?.getValue();
    if (yaml !== undefined) syncAttachmentRef.current?.(yaml);
  }, [readOnlyReason, executionsTabYaml, editorRef]);

  // Auto-open only on an unsaved workflow that asked for it, or on a saved
  // workflow whose sidebar the save thunk requested we restore. Never on an
  // existing workflow the user navigated to directly. Guarded per-mount so a
  // manual close stays.
  useEffect(() => {
    if (!isEditorMounted || !agentBuilder || !isChatAccessible) return;
    if (hasAutoOpenedRef.current) return;

    const shouldRestoreForSavedWorkflow =
      workflowId != null && consumeSidebarRestoreFor(workflowId);

    const shouldOpenForNewWorkflow = workflowId == null && autoOpenAgentChat;

    if (!shouldOpenForNewWorkflow && !shouldRestoreForSavedWorkflow) return;

    hasAutoOpenedRef.current = true;
    openAgentChat({
      isAutoOpen: true,
      initialMessage: initialAgentMessage,
      autoSendInitialMessage: Boolean(initialAgentMessage),
      attachments: initialAgentAttachments,
    });
  }, [
    isEditorMounted,
    agentBuilder,
    isChatAccessible,
    workflowId,
    openAgentChat,
    initialAgentMessage,
    initialAgentAttachments,
    autoOpenAgentChat,
  ]);

  useEffect(() => {
    return () => agentBuilder?.clearChatConfig();
  }, [agentBuilder]);

  // Close the sidebar on unmount (leaving the workflow scope). Empty deps so
  // it does not fire on prop changes. `application.navigateToApp` remounts
  // the tree, so create → detail also fires this — the save thunk handles
  // that case via `requestSidebarRestore`.
  useEffect(() => {
    return () => {
      chatRefHandle.current?.close();
      chatRefHandle.current = null;
      setSidebarOpen(false);
    };
  }, []);

  return {
    openAgentChat,
    isAgentBuilderAvailable: agentBuilder != null && isChatAccessible,
    proposalManager: proposalManagerRef.current,
  };
};

// Chats without a session tag are the editor's to adopt, like the one the top bar opens
// before the editor has published its config.
const isOtherChatSurface = (sessionTag: string | undefined): boolean =>
  sessionTag !== undefined && !isWorkflowEditorSessionTag(sessionTag);

const serializeClientDiagnostics = (
  errors: YamlValidationResult[] | null | undefined
): Array<{ severity: string; message: string; source: string }> | undefined => {
  if (!errors || errors.length === 0) return undefined;
  const relevant = errors.filter(
    (e): e is YamlValidationResult & { severity: 'error' | 'warning'; message: string } =>
      (e.severity === 'error' || e.severity === 'warning') && e.message != null
  );
  if (relevant.length === 0) return undefined;
  return relevant.map((e) => ({
    severity: e.severity,
    message: e.message,
    source: e.owner,
  }));
};

const buildWorkflowAttachment = ({
  yaml,
  attachmentId,
  workflowId,
  workflowName,
  diagnostics,
  readOnlyReason,
}: {
  yaml: string;
  attachmentId: string;
  workflowId?: string;
  workflowName?: string;
  diagnostics: ReturnType<typeof serializeClientDiagnostics>;
  readOnlyReason?: WorkflowEditorReadOnlyReason;
}) => ({
  id: attachmentId,
  type: WORKFLOW_YAML_ATTACHMENT_TYPE,
  // Lets a later session find this attachment. A workflow being created has no
  // id yet; `updateAttachmentOrigin` links it after the first save.
  ...(workflowId ? { origin: workflowId } : {}),
  data: {
    yaml,
    workflowId,
    name: workflowName,
    clientDiagnostics: diagnostics,
    readOnlyReason,
  },
});
