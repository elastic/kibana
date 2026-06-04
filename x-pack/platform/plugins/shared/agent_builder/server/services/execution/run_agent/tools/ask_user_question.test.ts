/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { createAskUserQuestionTool } from './ask_user_question';

describe('createAskUserQuestionTool', () => {
  const tool = createAskUserQuestionTool();
  const sampleQuestions = [
    {
      question: 'Pick a color',
      options: [{ label: 'red' }, { label: 'blue' }],
      multi_select: false,
    },
  ];

  it('returns a question_list prompt with a fresh step_id in interactive mode', async () => {
    const ctx: any = { executionMode: AgentExecutionMode.conversation };
    const result = await tool.handler({ questions: sampleQuestions }, ctx);

    expect(result).toMatchObject({
      prompt: {
        type: AgentPromptType.ask_user_question,
        questions: sampleQuestions,
      },
    });
    expect((result as any).prompt.id).toEqual(expect.any(String));
    expect((result as any).prompt.id.length).toBeGreaterThan(0);
  });

  it('returns a different step_id on each call', async () => {
    const ctx: any = { executionMode: AgentExecutionMode.conversation };
    const a = await tool.handler({ questions: sampleQuestions }, ctx);
    const b = await tool.handler({ questions: sampleQuestions }, ctx);
    expect((a as any).prompt.id).not.toEqual((b as any).prompt.id);
  });

  it('returns an error result (no prompt) in standalone mode', async () => {
    const ctx: any = { executionMode: AgentExecutionMode.standalone };
    const result = await tool.handler({ questions: sampleQuestions }, ctx);

    expect(result).not.toHaveProperty('prompt');
    expect(result).toHaveProperty('results');
    const results = (result as any).results;
    expect(results).toHaveLength(1);
    expect(JSON.stringify(results[0])).toMatch(/standalone/i);
  });
});
