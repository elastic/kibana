/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { CompactedConversation } from './conversation_compactor';
import { createPreExecutionSteps } from './round_steps';

const compactionResult = {
  compactionTriggered: true,
  summary: { summarized_round_count: 2 },
  tokensBefore: 100,
  tokensAfter: 20,
} as CompactedConversation;

const relevantSkillsSelection = {
  skills: [{ id: 'skill-1', name: 'Skill', path: '/skill', description: 'A skill' }],
};

describe('createPreExecutionSteps', () => {
  it('creates no workflow step when neither context field is present', () => {
    expect(createPreExecutionSteps({})).toEqual([]);
    expect(createPreExecutionSteps({ preExecutionWorkflow: {} })).toEqual([]);
  });

  it.each([
    [{ model_context: 'model context' }],
    [
      {
        workflow_context: {
          'nightshift.semantic_memory.recall': { version: 1, data: { recalled_ids: ['memory-1'] } },
        },
      },
    ],
    [
      {
        model_context: 'model context',
        workflow_context: {
          'nightshift.semantic_memory.recall': { version: 1, data: { recalled_ids: ['memory-1'] } },
        },
      },
    ],
  ])('creates a workflow step when context data is present', (preExecutionWorkflow) => {
    expect(createPreExecutionSteps({ preExecutionWorkflow })).toEqual([
      {
        type: ConversationRoundStepType.preExecutionWorkflow,
        ...preExecutionWorkflow,
      },
    ]);
  });

  it('orders compaction, workflow context, then relevant skills', () => {
    const steps = createPreExecutionSteps({
      compactionResult,
      preExecutionWorkflow: { model_context: 'model context' },
      relevantSkillsSelection,
    });

    expect(steps.map((step) => step.type)).toEqual([
      ConversationRoundStepType.compaction,
      ConversationRoundStepType.preExecutionWorkflow,
      ConversationRoundStepType.relevantSkills,
    ]);
  });
});
