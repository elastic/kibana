/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import type { Discovery, SignificantEvent } from '@kbn/significant-events-schema';

interface DiscoveryWriteToolResult {
  data?: {
    results?: DiscoveryWriteItemResult[];
  };
}

interface EventsWriteToolResult {
  data?: {
    results?: EventsWriteItemResult[];
  };
}

type DiscoveryWriteItemResult = Pick<Discovery, 'event_id' | 'discovery_id'> & {
  index: number;
  written: boolean;
  reason?: 'duplicate_within_window' | 'bulk_error';
};

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
      reason: 'bulk_error';
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
 * Extract discoveries from `discovery_write` tool call steps.
 */
export const extractDiscoveriesFromToolCall = (steps: ConverseStep[]): Discovery[] =>
  toolCallSteps(steps, platformSignificantEventsTools.discoveryWrite).flatMap((step) => {
    const items = getBulkItems<Partial<Discovery>>(step.params, 'discovery_write');
    const toolResult = (step.results?.[0] as DiscoveryWriteToolResult | undefined)?.data;
    const results = toolResult?.results;
    if (!Array.isArray(results)) {
      throw new Error('discovery_write input and result arrays are not aligned');
    }
    return validateAlignedResults(results, items.length, 'discovery_write')
      .map((result, index) =>
        result.reason === 'bulk_error'
          ? undefined
          : ({
              ...items[index],
              event_id: result.event_id,
              discovery_id: result.discovery_id,
            } as Discovery)
      )
      .filter((discovery): discovery is Discovery => discovery !== undefined);
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
