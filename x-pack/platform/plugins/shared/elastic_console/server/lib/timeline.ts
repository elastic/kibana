/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  type ConversationRound,
} from '@kbn/agent-builder-common';

export interface TimelineEvent {
  id: string;
  type: string;
  created_at: string;
  execution_id?: string;
  trigger_event_id?: string;
  actor?: { type: string; id: string; username?: string };
  data?: Record<string, unknown>;
}

interface ActorContext {
  agentId: string;
  username: string;
  userId?: string;
}

const parseExecutionId = (id: string): { roundId: string; index: number } | undefined => {
  const match = id.match(/^(.*)::execution(?:::(\d+))?$/);
  if (!match) {
    return undefined;
  }
  return { roundId: match[1], index: Number(match[2] ?? 0) };
};

const messageOf = (data: unknown): string => {
  if (!data || typeof data !== 'object' || !('message' in data)) {
    return '';
  }
  return typeof data.message === 'string' ? data.message : '';
};

const responseOf = (data: unknown): { message: string } => {
  if (!data || typeof data !== 'object' || !('outcome' in data)) {
    return { message: '' };
  }
  const outcome = (data as { outcome?: { type?: string; response?: { message?: unknown } } })
    .outcome;
  if (outcome?.type === 'responded' && typeof outcome.response?.message === 'string') {
    return { message: outcome.response.message };
  }
  return { message: '' };
};

export const roundsFromEvents = (events: TimelineEvent[]): ConversationRound[] => {
  const byId = new Map(events.map((event) => [event.id, event]));
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    if (!event.execution_id) {
      continue;
    }
    const group = groups.get(event.execution_id);
    if (group) {
      group.push(event);
    } else {
      groups.set(event.execution_id, [event]);
    }
  }

  const rounds: ConversationRound[] = [];
  for (const [executionId, group] of groups) {
    const parsed = parseExecutionId(executionId) ?? { roundId: executionId, index: 0 };
    const trigger = group.find((event) => event.trigger_event_id);
    const source = trigger?.trigger_event_id ? byId.get(trigger.trigger_event_id) : undefined;
    const initial = source?.type === 'user_message';
    const resume = source?.type === 'prompt_response';
    if (!initial && !resume) {
      continue;
    }

    const terminated = group.find((event) => event.type === 'execution_terminated');
    if (!terminated) {
      continue;
    }

    const stepEvents = group
      .filter((event) => event.type === 'execution_step')
      .sort((a, b) => {
        const left = typeof a.data?.sequence === 'number' ? a.data.sequence : 0;
        const right = typeof b.data?.sequence === 'number' ? b.data.sequence : 0;
        return left - right;
      });
    const rawSteps = stepEvents
      .map((event) => event.data?.step)
      .filter((step): step is ConversationRound['steps'][number] => !!step);
    const started = initial
      ? source
      : group.find((event) => event.type === 'execution_started') ?? terminated;
    const input = initial
      ? messageOf(source.data)
      : messageOf((source?.data as { input?: unknown } | undefined)?.input);
    const model = terminated.data?.model_usage;

    rounds.push({
      id: parsed.roundId,
      status: ConversationRoundStatus.completed,
      input: { message: input },
      steps: rawSteps,
      response: responseOf(terminated.data),
      started_at: started?.created_at ?? terminated.created_at,
      time_to_first_token:
        typeof terminated.data?.time_to_first_token === 'number'
          ? terminated.data.time_to_first_token
          : 0,
      time_to_last_token:
        typeof terminated.data?.time_to_last_token === 'number'
          ? terminated.data.time_to_last_token
          : 0,
      model_usage:
        model && typeof model === 'object'
          ? (model as ConversationRound['model_usage'])
          : { connector_id: 'elastic-ramen', llm_calls: 1, input_tokens: 0, output_tokens: 0 },
    });
  }
  return rounds;
};

export const hydrateRounds = (
  stored: ConversationRound[] | undefined,
  events: TimelineEvent[] | undefined
): ConversationRound[] => {
  const current = stored ?? [];
  const folded = roundsFromEvents(events ?? []);
  if (!current.length && folded.length) {
    return folded;
  }
  if (folded.length > current.length) {
    return folded;
  }
  return current;
};

export const eventsFromRounds = (
  rounds: ConversationRound[],
  ctx: ActorContext
): TimelineEvent[] => {
  const user = { type: 'user', id: ctx.userId ?? ctx.username, username: ctx.username };
  const agent = { type: 'agent', id: ctx.agentId };
  return rounds.flatMap((round) => {
    const started = round.started_at;
    const ended = new Date(
      new Date(started).getTime() + (round.time_to_last_token || 0)
    ).toISOString();
    const executionId = `${round.id}::execution`;
    const triggerId = `${round.id}::user_message`;
    const stepEvents = (round.steps ?? []).map((step, sequence) => ({
      id: `${round.id}::step::${sequence}`,
      type: 'execution_step',
      created_at: started,
      actor: agent,
      execution_id: executionId,
      trigger_event_id: triggerId,
      data: { step, sequence },
    }));
    return [
      {
        id: triggerId,
        type: 'user_message',
        created_at: started,
        actor: user,
        data: { message: round.input.message },
      },
      {
        id: `${round.id}::execution_started`,
        type: 'execution_started',
        created_at: started,
        actor: agent,
        execution_id: executionId,
        trigger_event_id: triggerId,
        data: { trigger_type: 'user_message' },
      },
      ...stepEvents,
      {
        id: `${round.id}::execution_terminated`,
        type: 'execution_terminated',
        created_at: ended,
        actor: agent,
        execution_id: executionId,
        trigger_event_id: triggerId,
        data: {
          model_usage: round.model_usage,
          time_to_first_token: round.time_to_first_token,
          time_to_last_token: round.time_to_last_token,
          outcome: { type: 'responded', response: { message: round.response.message } },
        },
      },
    ];
  });
};

export const conversationSchemaVersion = CONVERSATION_SCHEMA_VERSION;
