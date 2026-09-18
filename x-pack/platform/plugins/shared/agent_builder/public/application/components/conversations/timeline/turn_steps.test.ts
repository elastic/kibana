/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { addTurnStep } from './turn_steps';

const pausedCall = () =>
  createToolCallStep({ tool_call_id: 'toolu_1', tool_id: 'delete_index', params: {}, results: [] });

const resolvedCall = () =>
  createToolCallStep({
    tool_call_id: 'toolu_1',
    tool_id: 'delete_index',
    params: {},
    results: [{ tool_result_id: 'r1', type: 'other', data: {} }],
  });

const reasoning = (text: string): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});

describe('addTurnStep', () => {
  it('appends steps that are not tool calls', () => {
    const steps: ConversationRoundStep[] = [];

    addTurnStep(steps, reasoning('first'));
    addTurnStep(steps, reasoning('second'));

    expect(steps).toEqual([reasoning('first'), reasoning('second')]);
  });

  it('appends a tool call it has not seen', () => {
    const steps: ConversationRoundStep[] = [reasoning('thinking')];

    addTurnStep(steps, pausedCall());

    expect(steps).toEqual([reasoning('thinking'), pausedCall()]);
  });

  it('replaces the paused call the resume re-reports, keeping its position', () => {
    const steps: ConversationRoundStep[] = [pausedCall(), reasoning('after the pause')];

    addTurnStep(steps, resolvedCall());

    expect(steps).toEqual([resolvedCall(), reasoning('after the pause')]);
  });

  it('keeps two different calls apart', () => {
    const other = createToolCallStep({
      tool_call_id: 'toolu_2',
      tool_id: 'search',
      params: {},
      results: [],
    });
    const steps: ConversationRoundStep[] = [pausedCall()];

    addTurnStep(steps, other);

    expect(steps).toEqual([pausedCall(), other]);
  });
});
