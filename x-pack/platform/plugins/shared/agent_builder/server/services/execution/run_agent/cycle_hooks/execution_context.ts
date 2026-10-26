/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { AgentConfiguration, ExecutionTerminalEvent } from '@kbn/agent-builder-common';
import { TimelineEventType, isExecutionTerminalEvent } from '@kbn/agent-builder-common';
import type {
  AgentHandlerContext,
  CycleHookExecutionContext,
  ExecutionSummary,
  ProcessedTimelineEvent,
  ProcessedUserMessageEvent,
} from '@kbn/agent-builder-server';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { historyView } from '../utils/context_coverage';
import {
  executionSteps,
  groupTimelineExecutions,
  type TimelineExecution,
} from '../utils/context_timeline';
import type { ProcessedConversation } from '../utils/prepare_conversation';

/**
 * The read-only view of an execution handed to `getHandler` of every cycle hook. The run's data is
 * copied, so nothing a hook does to it reaches the prompt or the record.
 */
export const buildCycleHookExecutionContext = ({
  context,
  agentId,
  agentConfiguration,
  skills,
  roundId,
  executionId,
  resumed,
  conversationId,
  processedConversation,
  abortSignal,
}: {
  context: AgentHandlerContext;
  agentId: string;
  agentConfiguration: AgentConfiguration;
  skills: InternalSkillDefinition[];
  roundId: string;
  executionId: string;
  resumed: boolean;
  conversationId?: string;
  processedConversation: ProcessedConversation;
  abortSignal?: AbortSignal;
}): CycleHookExecutionContext => {
  // The history can be large: copied once, when a hook first reads it.
  let history: ConversationHistory | undefined;
  const getHistory = (): ConversationHistory => {
    if (!history) {
      history = conversationHistory(processedConversation);
    }
    return history;
  };
  return {
    request: context.request,
    abortSignal: abortSignal ?? new AbortController().signal,
    spaceId: context.spaceId,
    agent: { id: agentId, configuration: cloneDeep(agentConfiguration), skills },
    execution: { id: executionId, roundId, resumed, parentId: context.parentExecutionId },
    input: cloneDeep(processedConversation.nextInput),
    conversation: {
      id: conversationId,
      get events() {
        return getHistory().events;
      },
      get executions() {
        return getHistory().executions;
      },
    },
    services: {
      logger: context.logger,
      modelProvider: context.modelProvider,
      esClient: context.esClient,
      savedObjectsClient: context.savedObjectsClient,
    },
  };
};

interface ConversationHistory {
  events: ProcessedTimelineEvent[];
  executions: ExecutionSummary[];
}

/** The timeline before this execution; the paused round this run resumes is the current run, not history. */
const conversationHistory = (conversation: ProcessedConversation): ConversationHistory => {
  const events = cloneDeep(historyView(conversation).events);
  const executions: ExecutionSummary[] = [];
  for (const execution of groupTimelineExecutions(events)) {
    const summary = summarizeExecution(execution);
    if (summary) {
      executions.push(summary);
    }
  }
  return { events, executions };
};

/** An execution as its events tell it; one without a terminal event has not ended and gets none. */
const summarizeExecution = (
  execution: TimelineExecution<ProcessedTimelineEvent>
): ExecutionSummary | undefined => {
  const terminal = execution.events.find(
    (event): event is ProcessedTimelineEvent & ExecutionTerminalEvent =>
      isExecutionTerminalEvent(event)
  );
  if (!terminal) {
    return undefined;
  }
  const userMessage = execution.triggers.find(
    (event): event is ProcessedUserMessageEvent => event.type === TimelineEventType.userMessage
  );
  return {
    id: execution.id,
    input: userMessage?.data,
    steps: executionSteps(execution.events),
    ...outcomeOf(terminal),
    events: [...execution.triggers, ...execution.events],
  };
};

const outcomeOf = (
  terminal: ExecutionTerminalEvent
): Pick<ExecutionSummary, 'outcome' | 'response' | 'error'> => {
  switch (terminal.type) {
    case TimelineEventType.executionTerminated: {
      const { outcome } = terminal.data;
      return outcome.type === 'responded'
        ? { outcome: 'responded', response: outcome.response }
        : { outcome: 'prompt_requested' };
    }
    case TimelineEventType.executionFailed:
      return { outcome: 'failed', error: terminal.data.error };
    case TimelineEventType.executionAborted:
      return { outcome: 'aborted' };
  }
};
