/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionSummary,
  ConversationRoundStep,
  DynamicToolDefinition,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import { describedDynamicToolIds } from './described_dynamic_tools';
import type { ProcessedConversation } from './prepare_conversation';
import type { ProcessedTimelineEvent } from './context_timeline';

const definition = (toolId: string): DynamicToolDefinition => ({
  tool_id: toolId,
  description: `${toolId} tool`,
  parameters: { type: 'object', properties: {} },
});

/** A `load_skill` call, with the definitions of the tools it registered when it has any. */
const loadSkillCall = (id: string, toolIds: string[], { withDefinitions = true } = {}) =>
  ({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: id,
    tool_id: 'platform.core.load_skill',
    params: {},
    results: [
      {
        type: ToolResultType.other,
        tool_result_id: `${id}-r`,
        data: {
          loaded_tools: toolIds,
          ...(withDefinitions ? { dynamic_tools: toolIds.map(definition) } : {}),
        },
      },
    ],
    progression: [],
  } as unknown as ToolCallStep);

const conversationOf = (rounds: Array<{ id: string; steps: ConversationRoundStep[] }>) =>
  ({
    timeline: timelineFromRounds(
      rounds.map(({ id, steps }) => ({
        id,
        input: { message: `Q ${id}`, attachments: [] },
        steps,
        response: { message: `A ${id}` },
      }))
    ) as ProcessedTimelineEvent[],
    nextInput: { message: 'next', attachments: [] },
    attachmentTypes: [],
    attachmentStateManager: {} as ProcessedConversation['attachmentStateManager'],
  } as ProcessedConversation);

const summary = (overrides: Partial<CompactionSummary>): CompactionSummary =>
  ({ ...overrides } as CompactionSummary);

describe('describedDynamicToolIds', () => {
  it('collects the tools whose definitions a visible tool result carries', () => {
    const conversation = conversationOf([
      { id: 'r1', steps: [loadSkillCall('c1', ['skill.a', 'skill.b'])] },
    ]);

    expect(describedDynamicToolIds({ conversation, roundId: 'r2' })).toEqual(
      new Set(['skill.a', 'skill.b'])
    );
  });

  it('leaves out tools loaded without definitions, as before dynamic tools', () => {
    const conversation = conversationOf([
      { id: 'r1', steps: [loadSkillCall('c1', ['skill.old'], { withDefinitions: false })] },
    ]);

    expect(describedDynamicToolIds({ conversation, roundId: 'r2' })).toEqual(new Set());
  });

  it('leaves out tools whose definitions only the compaction summary hides', () => {
    const conversation = conversationOf([
      { id: 'r1', steps: [loadSkillCall('c1', ['skill.hidden'])] },
      { id: 'r2', steps: [loadSkillCall('c2', ['skill.visible'])] },
    ]);

    const ids = describedDynamicToolIds({
      conversation,
      roundId: 'r3',
      compactionSummary: summary({ summarized_up_to: { round_id: 'r1', tool_call_id: 'c1' } }),
    });

    expect(ids).toEqual(new Set(['skill.visible']));
  });

  it("keeps tools the compaction summary's snapshot defines", () => {
    const conversation = conversationOf([
      { id: 'r1', steps: [loadSkillCall('c1', ['skill.hidden'])] },
    ]);

    const ids = describedDynamicToolIds({
      conversation,
      roundId: 'r2',
      compactionSummary: summary({
        summarized_up_to: { round_id: 'r1', tool_call_id: 'c1' },
        dynamic_tools: [definition('skill.hidden')],
      }),
    });

    expect(ids).toEqual(new Set(['skill.hidden']));
  });

  it('collects the definitions of the paused round a resume continues', () => {
    const ids = describedDynamicToolIds({
      conversation: conversationOf([]),
      roundId: 'r1',
      resumedSteps: [loadSkillCall('c1', ['skill.resumed'])],
    });

    expect(ids).toEqual(new Set(['skill.resumed']));
  });
});
