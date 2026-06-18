/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createReasoningStep,
  createToolCallStep,
  ConversationRoundStepType,
} from '@kbn/agent-builder-common/chat/conversation';
import type { CompactionStep } from '@kbn/agent-builder-common/chat/conversation';
import { buildDisplayItems } from './round_events';

const makeToolCallStep = (toolCallId: string, groupId?: string) =>
  createToolCallStep({
    tool_call_id: toolCallId,
    tool_id: 'some_tool',
    params: {},
    results: [],
    ...(groupId !== undefined ? { tool_call_group_id: groupId } : {}),
  });

const makeReasoningStep = (text: string) => createReasoningStep({ reasoning: text });

const makeCompactionStep = (): CompactionStep => ({
  type: ConversationRoundStepType.compaction,
  summarized_round_count: 2,
  token_count_before: 1000,
  token_count_after: 400,
});

describe('buildDisplayItems', () => {
  it('returns an empty array for an empty steps list', () => {
    expect(buildDisplayItems([])).toEqual([]);
  });

  it('renders a reasoning step as an individual step', () => {
    const step = makeReasoningStep('some thought');
    const items = buildDisplayItems([step]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'step', step, index: 0 });
  });

  it('renders a compaction step as an individual step', () => {
    const step = makeCompactionStep();
    const items = buildDisplayItems([step]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'step', step, index: 0 });
  });

  it('renders a tool call without a group_id as an individual step', () => {
    const step = makeToolCallStep('tc-1');
    const items = buildDisplayItems([step]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'step', step, index: 0 });
  });

  it('renders a sole tool call that has a group_id as an individual step (singleton group)', () => {
    // Only one member in the group → never qualifies for grouping (threshold is > 1)
    const step = makeToolCallStep('tc-1', 'grp-A');
    const items = buildDisplayItems([step]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'step', step, index: 0 });
  });

  it('collapses two tool calls sharing a group_id into a single group item', () => {
    const stepA = makeToolCallStep('tc-1', 'grp-A');
    const stepB = makeToolCallStep('tc-2', 'grp-A');
    const items = buildDisplayItems([stepA, stepB]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'group',
      groupId: 'grp-A',
      steps: [stepA, stepB],
    });
  });

  it('positions the group at the index of the first tool call in the group', () => {
    const reasoning = makeReasoningStep('thinking…');
    const stepA = makeToolCallStep('tc-1', 'grp-A');
    const stepB = makeToolCallStep('tc-2', 'grp-A');

    const items = buildDisplayItems([reasoning, stepA, stepB]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: 'step', step: reasoning, index: 0 });
    expect(items[1]).toMatchObject({ kind: 'group', groupId: 'grp-A' });
  });

  it('handles mixed steps: solo tool call, group, and non-tool steps in order', () => {
    const reasoning = makeReasoningStep('thinking…');
    const soloTool = makeToolCallStep('tc-solo');
    const groupedA = makeToolCallStep('tc-g1', 'grp-X');
    const groupedB = makeToolCallStep('tc-g2', 'grp-X');
    const compaction = makeCompactionStep();

    const items = buildDisplayItems([reasoning, soloTool, groupedA, groupedB, compaction]);

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ kind: 'step', step: reasoning, index: 0 });
    expect(items[1]).toMatchObject({ kind: 'step', step: soloTool, index: 1 });
    expect(items[2]).toMatchObject({
      kind: 'group',
      groupId: 'grp-X',
      steps: [groupedA, groupedB],
    });
    expect(items[3]).toMatchObject({ kind: 'step', step: compaction, index: 4 });
  });

  it('handles two independent groups without cross-contamination', () => {
    const a1 = makeToolCallStep('tc-a1', 'grp-A');
    const a2 = makeToolCallStep('tc-a2', 'grp-A');
    const b1 = makeToolCallStep('tc-b1', 'grp-B');
    const b2 = makeToolCallStep('tc-b2', 'grp-B');

    const items = buildDisplayItems([a1, a2, b1, b2]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: 'group', groupId: 'grp-A', steps: [a1, a2] });
    expect(items[1]).toMatchObject({ kind: 'group', groupId: 'grp-B', steps: [b1, b2] });
  });

  it('does not emit duplicate group items when the same group_id appears more than twice', () => {
    const s1 = makeToolCallStep('tc-1', 'grp-A');
    const s2 = makeToolCallStep('tc-2', 'grp-A');
    const s3 = makeToolCallStep('tc-3', 'grp-A');

    const items = buildDisplayItems([s1, s2, s3]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'group',
      groupId: 'grp-A',
      steps: [s1, s2, s3],
    });
  });
});
