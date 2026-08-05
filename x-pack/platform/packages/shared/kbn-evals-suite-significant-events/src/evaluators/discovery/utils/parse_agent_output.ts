/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import type { SignificantEvent } from '@kbn/significant-events-schema';

interface EventsWriteToolResult {
  data?: {
    results?: EventsWriteItemResult[];
  };
}

type EventsWriteItemResult =
  | {
      index: number;
      event_uuid: string;
      event_id: string;
      written: true;
    }
  | {
      index: number;
      event_id: string;
      written: false;
      reason: 'duplicate_within_window' | 'bulk_error' | 'duplicate_key';
      existing_event_id?: string;
    };

const toolCallSteps = (steps: ConverseStep[], toolId: string) =>
  steps.filter((step) => step.type === 'tool_call' && step.tool_id === toolId && step.params);

const getBulkItems = (params: Record<string, unknown> | undefined): Partial<SignificantEvent>[] => {
  if (!Array.isArray(params?.items)) {
    return [];
  }
  return params.items as Partial<SignificantEvent>[];
};

const getAlignedResults = (
  items: Partial<SignificantEvent>[],
  results: EventsWriteItemResult[] | undefined
): EventsWriteItemResult[] | undefined => {
  if (!Array.isArray(results) || results.length !== items.length) {
    return undefined;
  }
  if (results.some((result, index) => result.index !== index)) {
    return undefined;
  }
  return results;
};

const parseEventsWriteStep = (
  step: ConverseStep
): { items: Partial<SignificantEvent>[]; results: EventsWriteItemResult[] } | undefined => {
  const items = getBulkItems(step.params);
  const rawResults = (step.results?.[0] as EventsWriteToolResult | undefined)?.data?.results;

  if (items.length > 0) {
    const alignedResults = getAlignedResults(items, rawResults);
    return alignedResults ? { items, results: alignedResults } : undefined;
  }

  // Tool schema may accept a bare item object, but converse steps keep the raw LLM args.
  if (!Array.isArray(rawResults) || rawResults.length === 0) {
    return undefined;
  }
  if (rawResults.some((result, index) => result.index !== index)) {
    return undefined;
  }

  return {
    items: rawResults.map(() => ({})),
    results: rawResults,
  };
};

/**
 * Extract events from `events_write` tool call steps for continuation seeding.
 * Includes duplicate_within_window outcomes so follow-up cycles can resolve the episode.
 */
export const extractDiscoveriesFromToolCall = (steps: ConverseStep[]): SignificantEvent[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).flatMap((step) => {
    const parsed = parseEventsWriteStep(step);
    if (!parsed) {
      return [];
    }

    const { items, results } = parsed;
    return results
      .map((result, index) =>
        !result.written && result.reason !== 'duplicate_within_window'
          ? undefined
          : ({
              ...items[index],
              event_id: result.event_id,
            } as SignificantEvent)
      )
      .filter((event): event is SignificantEvent => event !== undefined);
  });

/**
 * Extract only event IDs explicitly supplied by the agent to `events_write`.
 * Unlike `extractSignificantEventsFromToolCall`, this intentionally ignores handler-generated IDs so
 * evaluators can distinguish the agent's continuation routing from the final write outcome.
 */
export const extractRequestedEventIdsFromToolCall = (steps: ConverseStep[]): string[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).flatMap((step) =>
    getBulkItems(step.params)
      .map((item) => item.event_id)
      .filter((eventId): eventId is string => typeof eventId === 'string' && eventId.length > 0)
  );

/**
 * Extract significant events from `events_write` tool call steps.
 * Merges generated identifiers from successful tool results into their corresponding inputs.
 */
export const extractSignificantEventsFromToolCall = (steps: ConverseStep[]): SignificantEvent[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).flatMap((step) => {
    const parsed = parseEventsWriteStep(step);
    if (!parsed) {
      return [];
    }

    const { items, results } = parsed;
    return results
      .map((result, index) =>
        result.written
          ? ({
              ...items[index],
              event_id: result.event_id,
              event_uuid: result.event_uuid,
            } as SignificantEvent)
          : undefined
      )
      .filter((event): event is SignificantEvent => event !== undefined);
  });
