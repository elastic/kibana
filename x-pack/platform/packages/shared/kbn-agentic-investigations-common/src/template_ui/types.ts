/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

/**
 * Props passed to the `renderAssignees` render prop.
 *
 * The render prop is supplied by the consuming plugin at registration time so that
 * HTTP hooks and Kibana context remain outside the shared package. The slot calls it
 * with the conversation details it holds, and the plugin wraps the result in its own
 * `KibanaContextProvider` + `QueryClientProvider`.
 */
export interface AssigneesSlotRenderProps {
  /** Conversation id — used as the mutation target and as the popover data-test-subj. */
  conversationId: string;
  /**
   * `'investigation'` or `'escalation'`. The plugin uses this to pick the right
   * assignment endpoint and the right capability check.
   */
  templateId: string;
  /** Current full list of assignee user-profile uids. */
  assigneeUids: readonly string[];
  /** Current status string from metadata (e.g. `'open'` / `'closed'`). */
  status?: string;
  /**
   * Calls the flyout's internal refetch after a successful mutation, so the header
   * reflects the server-confirmed state without waiting for the 5 s poll.
   */
  refetchConversation?: () => Promise<void>;
}

/**
 * A render prop that the consuming plugin provides to the slot to render the interactive
 * assignee picker. When absent the header falls back to a read-only avatar stack.
 */
export type RenderAssignees = (props: AssigneesSlotRenderProps) => React.ReactNode;

/**
 * Props passed to the `renderLinkedInvestigations` render prop.
 *
 * The render prop is supplied by the consuming plugin at registration time so that HTTP hooks
 * and Kibana context remain outside the shared package. `openFullscreenConversation` from the
 * Agent Builder template context is captured at registration and forwarded here as
 * `onOpenInvestigation`, so the connected component can navigate without importing Agent Builder.
 */
export interface LinkedInvestigationsSlotRenderProps {
  /** Escalation conversation id — the entity whose linked investigations we are showing. */
  escalationId: string;
  /**
   * The ids of linked investigations read from `metadata.linked_investigations` of the current
   * escalation conversation. Used as a cache-busting input to the fetch query key so that
   * the 5 s conversation poll triggers a re-fetch when a new investigation is linked.
   */
  linkedInvestigationIds: readonly string[];
  /** Navigates to the investigation's chat page with its details flyout open. */
  onOpenInvestigation: (args: { conversationId: string; agentId: string }) => void;
}

/**
 * A render prop that the consuming plugin provides to the escalation overview slot to render
 * the connected linked-investigations list. When absent the slot renders nothing.
 */
export type RenderLinkedInvestigations = (
  props: LinkedInvestigationsSlotRenderProps
) => React.ReactNode;
