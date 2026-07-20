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
    results?: Array<
      Pick<Discovery, 'event_id' | 'discovery_id'> & {
        index: number;
        written: boolean;
        reason?: 'duplicate_within_window' | 'bulk_error';
      }
    >;
    event_id?: string;
  };
}

interface EventsWriteToolResult {
  data?: {
    results?: Array<{
      index: number;
      event_uuid?: string;
      event_id: string;
      written: boolean;
      reason?: 'bulk_error';
    }>;
    event_uuid?: string;
    written?: boolean;
  };
}

interface BulkToolParams {
  items?: Array<Record<string, unknown>>;
}

const toolCallSteps = (steps: ConverseStep[], toolId: string) =>
  steps.filter((step) => step.type === 'tool_call' && step.tool_id === toolId && step.params);

/**
 * Extract discoveries from `discovery_write` tool call steps.
 */
export const extractDiscoveriesFromToolCall = (steps: ConverseStep[]): Discovery[] =>
  toolCallSteps(steps, platformSignificantEventsTools.discoveryWrite).flatMap((step) => {
    const params = step.params as BulkToolParams;
    const toolResult = (step.results?.[0] as DiscoveryWriteToolResult | undefined)?.data;
    if (!Array.isArray(params.items)) {
      return [
        {
          ...step.params,
          ...(toolResult?.event_id ? { event_id: toolResult.event_id } : {}),
        } as Discovery,
      ];
    }
    const results = toolResult?.results;
    if (!Array.isArray(results) || results.length !== params.items.length) {
      throw new Error('discovery_write input and result arrays are not aligned');
    }
    return params.items.flatMap((item, index) => {
      const result = results[index];
      if (result.reason === 'bulk_error') return [];
      return [
        {
          ...item,
          event_id: result.event_id,
          discovery_id: result.discovery_id,
          written: result.written,
        } as unknown as Discovery,
      ];
    });
  });

/**
 * Extract significant events from `events_write` tool call steps.
 * Merges `event_uuid` and `written` from the tool result so evaluators can inspect dedup outcomes.
 */
export const extractSignificantEventsFromToolCall = (steps: ConverseStep[]): SignificantEvent[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).flatMap((step) => {
    const params = step.params as BulkToolParams;
    const toolResult = (step.results?.[0] as EventsWriteToolResult | undefined)?.data;
    if (!Array.isArray(params.items)) {
      return [
        {
          ...step.params,
          ...(toolResult?.event_uuid != null ? { event_uuid: toolResult.event_uuid } : {}),
          ...(toolResult?.written != null ? { written: toolResult.written } : {}),
        } as SignificantEvent,
      ];
    }
    const results = toolResult?.results;
    if (!Array.isArray(results) || results.length !== params.items.length) {
      throw new Error('events_write input and result arrays are not aligned');
    }
    return params.items.flatMap((item, index) => {
      const result = results[index];
      if (!result.written) return [];
      return [
        {
          ...item,
          event_id: result.event_id,
          event_uuid: result.event_uuid,
          written: true,
        } as unknown as SignificantEvent,
      ];
    });
  });
