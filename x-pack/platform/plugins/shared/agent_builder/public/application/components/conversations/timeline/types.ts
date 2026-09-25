/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UserMessageEvent,
  ExecutionTerminatedEvent,
  ExecutionFailedEvent,
  ExecutionAbortedEvent,
  ConversationRoundStep,
  ConversationRoundOrigin,
} from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { ExecutionStreamingEventData } from '../../../../services/events';

export type AgentTurnStatus = 'running' | 'awaiting_prompt' | 'completed' | 'failed' | 'aborted';

/** The event that ends a run, whatever way it ended. */
export type TerminalEvent = ExecutionTerminatedEvent | ExecutionFailedEvent | ExecutionAbortedEvent;

export interface AgentTurnItem {
  kind: 'agentTurn';
  key: string;
  executionId?: string;
  triggerEventId?: string;
  status: AgentTurnStatus;
  startedAt: string;
  origin?: ConversationRoundOrigin;
  steps: ConversationRoundStep[];
  response?: { message: string };
  terminal?: TerminalEvent;
  pendingPrompts?: PromptRequest[];
  /** Highest version of every attachment referenced up to and including this turn's trigger. */
  attachmentRefs?: AttachmentVersionRef[];
  /** The trigger message's own refs, including attachments the agent created in this turn. */
  triggerAttachmentRefs?: AttachmentVersionRef[];
}

export type TimelineItem =
  | { kind: 'userMessage'; key: string; event: UserMessageEvent; isPending?: boolean }
  | AgentTurnItem;

/** A timeline item that speaks for a human, not for a run. */
export type UserEntry = Extract<TimelineItem, { kind: 'userMessage' }>;

/** One run, collected from its events before it becomes an {@link AgentTurnItem}. */
export interface ExecutionAccumulator {
  executionId: string;
  startedAt: string;
  triggerEventId?: string;
  steps: ConversationRoundStep[];
  terminal?: TerminalEvent;
  /** The half-written answer, while the run is still streaming. */
  streaming?: ExecutionStreamingEventData;
  attachmentRefs?: AttachmentVersionRef[];
}
