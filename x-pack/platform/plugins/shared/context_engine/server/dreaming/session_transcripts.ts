/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DreamingMemory } from '../../common/step_types/dreaming_memory';
import type {
  SessionEventPosition,
  SessionEventsService,
  SessionTurn,
  StoredSessionEvent,
} from '../session_events/types';
import { SESSION_TURN_ID_PREFIX } from './ids';
import { estimateTokens } from './transcript_batches';
import {
  MAX_TEXT_PART_CHARS,
  MAX_TOOL_ARGUMENTS_CHARS,
  MAX_TOOL_RESULT_CHARS,
  capRound,
  truncate,
} from './transcript_text';

export const SESSION_TURN_TYPE = 'session.turn';

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);

const renderEvent = ({ raw }: StoredSessionEvent): string[] => {
  switch (raw.type) {
    case 'user':
      return raw.content.trim()
        ? [`User: ${truncate(raw.content.trim(), MAX_TEXT_PART_CHARS)}`]
        : [];
    case 'assistant': {
      const lines = raw.content?.trim()
        ? [`Assistant: ${truncate(raw.content.trim(), MAX_TEXT_PART_CHARS)}`]
        : [];
      for (const call of raw.tool_calls ?? []) {
        lines.push(
          `Assistant called ${call.name}: ${truncate(asText(call.args), MAX_TOOL_ARGUMENTS_CHARS)}`
        );
      }
      return lines;
    }
    case 'tool':
      return [
        `Tool result (${raw.tool_name}${raw.status === 'failed' ? ', failed' : ''}): ${truncate(
          asText(raw.result),
          MAX_TOOL_RESULT_CHARS
        )}`,
      ];
    default:
      return [];
  }
};

/**
 * Builds the transcript of one turn from its user, assistant and tool events. Reasoning and meta
 * events are left out. Returns undefined when nobody said anything in the turn.
 */
export const buildTurnTranscript = (events: readonly StoredSessionEvent[]): string | undefined => {
  const spoken = events.some(
    ({ raw }) =>
      (raw.type === 'user' && raw.content.trim().length > 0) ||
      (raw.type === 'assistant' && !!raw.content?.trim())
  );
  const lines = events.flatMap(renderEvent);
  return spoken && lines.length > 0 ? capRound(lines.join('\n')) : undefined;
};

const toMemory = (
  { sessionId, turnId, endedAt }: SessionTurn,
  transcript: string,
  spaceId: string
): DreamingMemory => ({
  id: `${SESSION_TURN_ID_PREFIX}${sessionId}/${turnId}`,
  type: SESSION_TURN_TYPE,
  title: `Agent conversation, turn ending ${endedAt}`,
  content: transcript,
  updated_at: endedAt,
  attributes: { 'session.id': sessionId, 'session.turn_id': turnId },
  permissions: { kibana: { privileges: [{ space: spaceId }] } },
});

/** The cursor of a read that stopped after an event: where the next read continues. */
export const encodeAfter = ({
  sessionId,
  eventId,
}: Pick<SessionEventPosition, 'sessionId' | 'eventId'>) => JSON.stringify([sessionId, eventId]);

export const decodeAfter = (after: string): { sessionId: string; eventId: string } | undefined => {
  try {
    const parsed: unknown = JSON.parse(after);
    return Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === 'string' &&
      typeof parsed[1] === 'string'
      ? { sessionId: parsed[0], eventId: parsed[1] }
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Reads the turns of an AI index's session events since the cursor as transcripts, oldest first.
 * When `size` or `maxTokens` cuts the read, the cursor stops before the first event of a turn
 * left out, so the next read starts there.
 */
export const readSessionTranscripts = async ({
  sessionEvents,
  spaceId,
  aiIndexId,
  since,
  after,
  until,
  size,
  maxTokens = Infinity,
}: {
  sessionEvents: SessionEventsService;
  spaceId: string;
  aiIndexId: string;
  since: string;
  after?: string;
  until: string;
  /** The most events one read looks at. */
  size: number;
  /** The read stops before its transcripts exceed this many estimated tokens. */
  maxTokens?: number;
}): Promise<{
  memories: DreamingMemory[];
  resume_from: string;
  resume_after?: string;
  skipped: number;
}> => {
  const afterEvent = after ? decodeAfter(after) : undefined;
  if (Date.parse(until) <= Date.parse(since)) {
    return { memories: [], resume_from: since, ...(after && { resume_after: after }), skipped: 0 };
  }

  const { positions, turns, full } = await sessionEvents.readTurns({
    space: spaceId,
    aiIndexId,
    since,
    ...(afterEvent && { after: afterEvent }),
    until,
    size,
  });

  const memories: DreamingMemory[] = [];
  const left = new Set<string>();
  let skipped = 0;
  let tokens = 0;
  for (const turn of turns) {
    const transcript = buildTurnTranscript(turn.events);
    if (transcript === undefined) {
      skipped++;
      continue;
    }
    const memory = toMemory(turn, transcript, spaceId);
    const memoryTokens = estimateTokens(memory);
    if (memories.length > 0 && tokens + memoryTokens > maxTokens) {
      turns
        .slice(turns.indexOf(turn))
        .forEach((rest) => left.add(`${rest.sessionId}\u0000${rest.turnId}`));
      break;
    }
    memories.push(memory);
    tokens += memoryTokens;
  }

  const firstLeft = positions.findIndex(({ sessionId, turnId }) =>
    left.has(`${sessionId}\u0000${turnId}`)
  );
  const stoppedAt =
    firstLeft !== -1
      ? positions[firstLeft - 1]
      : full
      ? positions[positions.length - 1]
      : undefined;
  return {
    memories,
    ...(stoppedAt
      ? { resume_from: stoppedAt.savedAt, resume_after: encodeAfter(stoppedAt) }
      : { resume_from: until }),
    skipped,
  };
};
