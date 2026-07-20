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
  data?: Pick<Discovery, 'event_id'>;
}

interface EventsWriteToolResult {
  data?: { event_uuid?: string; written?: boolean };
}

const toolCallSteps = (steps: ConverseStep[], toolId: string) =>
  steps.filter((step) => step.type === 'tool_call' && step.tool_id === toolId && step.params);

/**
 * Extract discoveries from `discovery_write` tool call steps.
 */
export const extractDiscoveriesFromToolCall = (steps: ConverseStep[]): Discovery[] =>
  toolCallSteps(steps, platformSignificantEventsTools.discoveryWrite).map((step) => {
    const eventId = (step.results?.[0] as DiscoveryWriteToolResult | undefined)?.data?.event_id;
    return { ...step.params, ...(eventId ? { event_id: eventId } : {}) } as Discovery;
  });

/**
 * Extract significant events from `events_write` tool call steps.
 * Merges `event_uuid` and `written` from the tool result so evaluators can inspect dedup outcomes.
 */
export const extractSignificantEventsFromToolCall = (steps: ConverseStep[]): SignificantEvent[] =>
  toolCallSteps(steps, platformSignificantEventsTools.eventsWrite).map((step) => {
    const result = (step.results?.[0] as EventsWriteToolResult | undefined)?.data;
    return {
      ...step.params,
      ...(result?.event_uuid != null ? { event_uuid: result.event_uuid } : {}),
      ...(result?.written != null ? { written: result.written } : {}),
    } as SignificantEvent;
  });
