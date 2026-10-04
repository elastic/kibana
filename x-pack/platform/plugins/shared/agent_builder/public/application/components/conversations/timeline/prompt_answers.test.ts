/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AskUserQuestionStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { createPromptResponseEvent } from './items/prompt_response_event.factory';
import { answersByPromptId, withQuestionAnswers } from './prompt_answers';

const PROMPT_ID = '66199c65-a0e6-4a62-a0e5-784c6a5af63a';

const questionStep = (overrides?: Partial<AskUserQuestionStep>): AskUserQuestionStep => ({
  type: ConversationRoundStepType.askUserQuestion,
  prompt_id: PROMPT_ID,
  questions: [
    {
      question: 'Which Kibana app are you most interested in exploring today?',
      options: [{ label: 'Discover' }, { label: 'Dashboard' }],
      multi_select: false,
    },
  ],
  ...overrides,
});

const questionAnswer = createPromptResponseEvent({
  data: {
    prompt_requested_event_id: 'round-1::execution_terminated',
    responses: { [PROMPT_ID]: { answers: [{ choice: [0] }] } },
  },
});

describe('answersByPromptId', () => {
  it('keys the answers by the prompt they answer', () => {
    expect(answersByPromptId([questionAnswer])).toEqual(new Map([[PROMPT_ID, [{ choice: [0] }]]]));
  });

  it('ignores yes/no decisions, which answer no question', () => {
    expect(answersByPromptId([createPromptResponseEvent()])).toEqual(new Map());
  });

  it('last write wins when two prompt_response events answer the same prompt id (failed resume then retry)', () => {
    const firstAnswer = createPromptResponseEvent({
      id: 'pr-1',
      data: {
        prompt_requested_event_id: 'round-1::execution_terminated',
        responses: { [PROMPT_ID]: { answers: [{ choice: [0] }] } },
      },
    });
    const retryAnswer = createPromptResponseEvent({
      id: 'pr-2',
      data: {
        prompt_requested_event_id: 'round-1::execution_terminated',
        responses: { [PROMPT_ID]: { answers: [{ choice: [1] }] } },
      },
    });

    expect(answersByPromptId([firstAnswer, retryAnswer])).toEqual(
      new Map([[PROMPT_ID, [{ choice: [1] }]]])
    );
  });
});

describe('withQuestionAnswers', () => {
  it('joins the answers onto the step the server saved unanswered', () => {
    const joined = withQuestionAnswers(questionStep(), answersByPromptId([questionAnswer]));

    expect(joined).toEqual(questionStep({ answers: [{ choice: [0] }] }));
  });

  it('leaves a step whose answers are already saved', () => {
    const answered = questionStep({ answers: [{ skipped: true }] });

    expect(withQuestionAnswers(answered, answersByPromptId([questionAnswer]))).toBe(answered);
  });

  it('leaves the step alone while the question is still unanswered', () => {
    const step = questionStep();

    expect(withQuestionAnswers(step, new Map())).toBe(step);
  });

  it('leaves steps that are not questions alone', () => {
    const step = { type: ConversationRoundStepType.reasoning, reasoning: 'thinking' } as const;

    expect(withQuestionAnswers(step, answersByPromptId([questionAnswer]))).toBe(step);
  });
});
