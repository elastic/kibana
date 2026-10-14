/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { TimelineEventType, isToolCallStep } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';

/**
 * Tool call ids that have a resolved (non-empty results) step somewhere in the timeline. A tool
 * call paused for a prompt is saved with empty results and never rewritten; the resume execution
 * re-emits a resolved copy under a new execution id, so the paused copy would otherwise render a
 * second, stuck "running…" row.
 */
export const resolvedToolCallIds = (events: TimelineDisplayEvent[]): Set<string> => {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.type !== TimelineEventType.executionStep) {
      continue;
    }
    const { step } = event.data;
    if (isToolCallStep(step) && step.results.length > 0) {
      ids.add(step.tool_call_id);
    }
  }
  return ids;
};

/** A tool call step whose result already arrived under a later execution, so this copy is stale. */
export const isSupersededToolCallStep = (
  step: ConversationRoundStep,
  resolved: Set<string>
): boolean => isToolCallStep(step) && step.results.length === 0 && resolved.has(step.tool_call_id);
