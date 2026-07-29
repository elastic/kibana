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

interface IndexedResult {
  index: number;
}

const toolCallSteps = (steps: ConverseStep[], toolId: string) =>
  steps.filter((step) => step.type === 'tool_call' && step.tool_id === toolId && step.params);

const getBulkItems = <T>(params: Record<string, unknown> | undefined, toolId: string): T[] => {
  if (!Array.isArray(params?.items)) {
    throw new Error(`${toolId}: expected params.items to be an array, got ${typeof params?.items}`);
  }
  return params.items as T[];
};

const validateAlignedResults = <T extends IndexedResult>(
  results: T[],
  itemCount: number,
  toolId: string
): T[] => {
  if (results.length !== itemCount || results.some((result, index) => result.index !== index)) {
    throw new Error(`${toolId} input and result arrays are not aligned`);
  }
  return results;
};

/**
 * Extract discoveries from `events_write` tool call steps.
 */
export const extractDiscoveriesFromToolCall = (steps: ConverseStep[]): SignificantEvent[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).flatMap((step) => {
    const items = getBulkItems<Partial<SignificantEvent>>(step.params, 'events_write');
    const toolResult = (step.results?.[0] as EventsWriteToolResult | undefined)?.data;
    const results = toolResult?.results;
    if (!Array.isArray(results)) {
      throw new Error('events_write input and result arrays are not aligned');
    }
    return validateAlignedResults(results, items.length, 'events_write')
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
 * Unlike `extractDiscoveriesFromToolCall`, this intentionally ignores handler-generated IDs so
 * evaluators can distinguish the agent's continuation routing from the final write outcome.
 */
export const extractRequestedEventIdsFromToolCall = (steps: ConverseStep[]): string[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).flatMap((step) => {
    const items = Array.isArray(step.params?.items)
      ? (step.params.items as Array<Partial<SignificantEvent>>)
      : [];
    return items
      .map((item) => item.event_id)
      .filter((eventId): eventId is string => typeof eventId === 'string' && eventId.length > 0);
  });

/**
 * Extract significant events from `events_write` tool call steps.
 * Merges generated identifiers from successful tool results into their corresponding inputs.
 */
export const extractSignificantEventsFromToolCall = (steps: ConverseStep[]): SignificantEvent[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).flatMap((step) => {
    const items = getBulkItems<Partial<SignificantEvent>>(step.params, 'events_write');
    const toolResult = (step.results?.[0] as EventsWriteToolResult | undefined)?.data;
    const results = toolResult?.results;
    if (!Array.isArray(results)) {
      throw new Error('events_write input and result arrays are not aligned');
    }
    return validateAlignedResults(results, items.length, 'events_write')
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
