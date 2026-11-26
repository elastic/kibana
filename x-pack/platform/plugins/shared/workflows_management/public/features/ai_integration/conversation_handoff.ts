/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Module-level handoff state that survives `application.navigateToApp`
// remounts so the /workflows/create chat can continue on the saved detail
// view. See `carryConversationToWorkflow` below.

const SESSION_TAG_PREFIX = 'workflow-editor:';
const STORAGE_KEY_PREFIX = 'agentBuilder.lastConversation.';

/** Tag of the chat session a workflow editor shares with the sidebar. */
export const getWorkflowEditorSessionTag = (sessionId: string): string =>
  `${SESSION_TAG_PREFIX}${sessionId}`;

/** True for any workflow editor's chat session, false for other chat surfaces such as diagnosis. */
export const isWorkflowEditorSessionTag = (sessionTag: string): boolean =>
  sessionTag.startsWith(SESSION_TAG_PREFIX);

// Session id of the `/workflows/create` chat, so its conversation can be moved
// onto the saved workflow's session tag. This is the id the tag is built from,
// not the id of the attachment the chat carries.
let lastCreateSessionId: string | undefined;

export const setLastCreateSessionId = (sessionId: string | undefined): void => {
  lastCreateSessionId = sessionId;
};

// Agent the `/workflows/create` chat has selected. Its conversation is stored under
// that agent's key, so the saved workflow's chat has to use the same agent to find it.
let lastCreateAgentId: string | undefined;

export const setLastCreateAgentId = (agentId: string | undefined): void => {
  lastCreateAgentId = agentId;
};

let carriedAgent: { workflowId: string; agentId: string } | undefined;

/**
 * Single-shot: the agent `carryConversationToWorkflow` handed over to the chat of
 * `workflowId`, if the create-route chat had one selected.
 */
export const takeCarriedAgentFor = (workflowId: string): string | undefined => {
  if (carriedAgent?.workflowId !== workflowId) return undefined;
  const { agentId } = carriedAgent;
  carriedAgent = undefined;
  return agentId;
};

let sidebarOpen = false;

export const setSidebarOpen = (open: boolean): void => {
  sidebarOpen = open;
};

export const isSidebarOpen = (): boolean => sidebarOpen;

// Single-shot: set by the save thunk when the sidebar was open, consumed by
// the destination editor's auto-open effect for a matching workflowId.
let pendingSidebarRestore: string | undefined;

export const requestSidebarRestore = (workflowId: string): void => {
  pendingSidebarRestore = workflowId;
};

export const consumeSidebarRestoreFor = (workflowId: string): boolean => {
  if (pendingSidebarRestore !== workflowId) return false;
  pendingSidebarRestore = undefined;
  return true;
};

/**
 * True when the sidebar will restore a conversation for this session, which the
 * editor cannot sync into until it knows which attachment that conversation
 * already holds. Mirrors the key `agent_builder` writes on open.
 */
export const hasPersistedConversation = (sessionId: string): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  const prefix = `${STORAGE_KEY_PREFIX}${SESSION_TAG_PREFIX}${sessionId}.`;
  for (let i = 0; i < window.localStorage.length; i++) {
    if (window.localStorage.key(i)?.startsWith(prefix)) return true;
  }
  return false;
};

/**
 * Rewrite persisted conversation-id localStorage entries from the create
 * session's tag onto `savedWorkflowId`'s tag. Iterates a prefix because keys
 * include a trailing agentId we don't know here; the agent the create chat had
 * selected is kept for `takeCarriedAgentFor`. No-op if no create session was
 * tracked or `localStorage` is unavailable.
 */
export const carryConversationToWorkflow = (savedWorkflowId: string): void => {
  const from = lastCreateSessionId;
  lastCreateSessionId = undefined;
  const agentId = lastCreateAgentId;
  lastCreateAgentId = undefined;

  if (!from || from === savedWorkflowId) return;
  carriedAgent = agentId ? { workflowId: savedWorkflowId, agentId } : undefined;
  if (typeof window === 'undefined' || !window.localStorage) return;

  const fromTag = getWorkflowEditorSessionTag(from);
  const toTag = getWorkflowEditorSessionTag(savedWorkflowId);
  const fromPrefix = `${STORAGE_KEY_PREFIX}${fromTag}.`;

  // Snapshot keys first — mutating localStorage while iterating can shift indexes.
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(fromPrefix)) keys.push(key);
  }

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value != null) {
      const suffix = key.slice(fromPrefix.length);
      const targetKey = `${STORAGE_KEY_PREFIX}${toTag}.${suffix}`;
      // Independent try/catch so a quota-exceeded write still cleans up the
      // source, and a failing remove doesn't abort remaining keys.
      try {
        window.localStorage.setItem(targetKey, value);
      } catch {
        // best-effort
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        // best-effort
      }
    }
  }
};
