/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SmlChunk } from '@kbn/agent-builder-plugin/server';

const CONVERSATION_SML_TYPE = 'conversation';

export const OTEL_ORIGIN_PREFIX = 'otel:';

const MAX_PARAMS_LENGTH = 200;

/**
 * Lightweight representation of a conversation round as stored in ES.
 * Only the fields needed for SML chunking are included.
 */
interface PersistentRound {
  input?: { message?: string };
  response?: { message?: string };
  steps?: Array<{
    type: string;
    tool_id?: string;
    params?: Record<string, unknown>;
  }>;
}

/**
 * Minimal shape of the `.chat-conversations` ES document source,
 * containing only the fields used by memory extraction.
 */
export interface ConversationDocumentSource {
  title?: string;
  user_name?: string;
  agent_id?: string;
  conversation_rounds?: PersistentRound[];
  rounds?: PersistentRound[];
}

const summarizeParams = (params: Record<string, unknown>): string => {
  const raw = JSON.stringify(params);
  if (raw.length <= MAX_PARAMS_LENGTH) {
    return raw;
  }
  return raw.slice(0, MAX_PARAMS_LENGTH) + '…';
};

const extractToolSummaries = (steps: PersistentRound['steps']): string[] => {
  if (!steps) return [];
  return steps
    .filter((step) => step.type === 'tool_call' && step.tool_id)
    .map((step) => {
      const paramsSummary = step.params ? ` ${summarizeParams(step.params)}` : '';
      return `${step.tool_id}${paramsSummary}`;
    });
};

/**
 * Extracts SML chunks from a conversation document, producing one chunk per round.
 *
 * Each chunk contains the user message, assistant response, and a summary of
 * tool calls made during that round, structured as searchable content.
 */
export const extractConversationTurns = ({
  source,
  logger,
}: {
  source: ConversationDocumentSource;
  logger: Logger;
}): SmlChunk[] => {
  const rounds = source.conversation_rounds ?? source.rounds ?? [];
  const conversationTitle = source.title ?? 'Untitled conversation';

  if (rounds.length === 0) {
    logger.debug(`MemoryExtraction: no rounds found for conversation "${conversationTitle}"`);
    return [];
  }

  const chunks: SmlChunk[] = [];

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const userMessage = round.input?.message ?? '';
    const assistantMessage = round.response?.message ?? '';

    if (!userMessage && !assistantMessage) {
      continue;
    }

    const contentParts: string[] = [];

    if (userMessage) {
      contentParts.push(`User: ${userMessage}`);
    }
    if (assistantMessage) {
      contentParts.push(`Assistant: ${assistantMessage}`);
    }

    const toolSummaries = extractToolSummaries(round.steps);
    if (toolSummaries.length > 0) {
      contentParts.push(`Tools used: ${toolSummaries.join(', ')}`);
    }

    chunks.push({
      type: CONVERSATION_SML_TYPE,
      title: `${conversationTitle} - Round ${i + 1}`,
      content: contentParts.join('\n'),
      permissions: [],
    });
  }

  return chunks;
};

// ---------------------------------------------------------------------------
// OTel trace conversation extraction
// ---------------------------------------------------------------------------

interface OtelSpanEvent {
  name?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Shape of an OTel span document stored in `claude-code-otel-traces`.
 * Only the fields used by the memory extractor are declared.
 */
export interface OtelSpanSource {
  trace_id?: string;
  conversation_id?: string;
  operation_name?: string;
  name?: string;
  attributes?: Record<string, unknown>;
  events?: OtelSpanEvent[];
  resource?: Record<string, unknown>;
  space?: string;
  '@timestamp'?: string;
  start_time?: string;
  end_time?: string;
}

const getAttr = (attrs: Record<string, unknown> | undefined, key: string): string => {
  if (!attrs) return '';
  const val = attrs[key];
  return typeof val === 'string' ? val : '';
};

const getNumAttr = (attrs: Record<string, unknown> | undefined, key: string): number | undefined => {
  if (!attrs) return undefined;
  const val = attrs[key];
  return typeof val === 'number' ? val : undefined;
};

const extractOtelToolCalls = (events: OtelSpanEvent[] | undefined): string[] => {
  if (!events) return [];
  return events
    .filter((e) => e.name === 'gen_ai.tool.call' && e.attributes)
    .map((e) => {
      const toolName = getAttr(e.attributes as Record<string, unknown>, 'tool_name');
      return toolName || 'unknown_tool';
    });
};

interface OtelRound {
  userMessage: string;
  assistantMessage: string;
  toolCalls: string[];
}

/**
 * Groups sorted message spans into rounds (consecutive user + assistant pairs).
 * A round starts with a user_message span and ends with the next chat span.
 * Unpaired messages still produce a round with the available side.
 */
const groupIntoRounds = (
  messageSpans: OtelSpanSource[]
): OtelRound[] => {
  const rounds: OtelRound[] = [];
  let currentRound: Partial<OtelRound> | undefined;

  for (const span of messageSpans) {
    const op = span.operation_name;

    if (op === 'user_message') {
      if (currentRound) {
        rounds.push({
          userMessage: currentRound.userMessage ?? '',
          assistantMessage: currentRound.assistantMessage ?? '',
          toolCalls: currentRound.toolCalls ?? [],
        });
      }
      currentRound = {
        userMessage: getAttr(span.attributes, 'input.value'),
        assistantMessage: '',
        toolCalls: [],
      };
    } else if (op === 'chat') {
      if (!currentRound) {
        currentRound = { userMessage: '', toolCalls: [] };
      }
      currentRound.assistantMessage = getAttr(span.attributes, 'output.value');
      currentRound.toolCalls = [
        ...(currentRound.toolCalls ?? []),
        ...extractOtelToolCalls(span.events),
      ];
    }
  }

  if (currentRound) {
    rounds.push({
      userMessage: currentRound.userMessage ?? '',
      assistantMessage: currentRound.assistantMessage ?? '',
      toolCalls: currentRound.toolCalls ?? [],
    });
  }

  return rounds;
};

/**
 * Extracts SML chunks from OTel trace spans, producing one chunk per round.
 *
 * The spans come from the `claude-code-otel-traces` index where each conversation
 * is a trace with UserMessage and ChatComplete child spans.
 */
export const extractOtelTraceTurns = ({
  spans,
  logger,
}: {
  spans: OtelSpanSource[];
  logger: Logger;
}): SmlChunk[] => {
  const rootSpan = spans.find((s) => s.operation_name === 'converse');
  const projectName = rootSpan?.resource
    ? getAttr(rootSpan.resource, 'project.name')
    : '';
  const conversationId = rootSpan?.conversation_id ?? 'unknown';
  const conversationTitle = projectName
    ? `${projectName} - ${conversationId}`
    : conversationId;

  const messageSpans = spans
    .filter((s) => s.operation_name === 'user_message' || s.operation_name === 'chat')
    .sort((a, b) => {
      const idxA = getNumAttr(a.attributes, 'cursor.message_index');
      const idxB = getNumAttr(b.attributes, 'cursor.message_index');
      if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
      const tsA = a['@timestamp'] ?? a.start_time ?? '';
      const tsB = b['@timestamp'] ?? b.start_time ?? '';
      return tsA.localeCompare(tsB);
    });

  if (messageSpans.length === 0) {
    logger.debug(
      `MemoryExtraction: no message spans found for otel conversation "${conversationId}"`
    );
    return [];
  }

  const rounds = groupIntoRounds(messageSpans);
  const chunks: SmlChunk[] = [];

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    if (!round.userMessage && !round.assistantMessage) continue;

    const contentParts: string[] = [];
    if (round.userMessage) contentParts.push(`User: ${round.userMessage}`);
    if (round.assistantMessage) contentParts.push(`Assistant: ${round.assistantMessage}`);
    if (round.toolCalls.length > 0) {
      contentParts.push(`Tools used: ${round.toolCalls.join(', ')}`);
    }

    chunks.push({
      type: CONVERSATION_SML_TYPE,
      title: `${conversationTitle} - Round ${i + 1}`,
      content: contentParts.join('\n'),
      permissions: [],
    });
  }

  return chunks;
};
