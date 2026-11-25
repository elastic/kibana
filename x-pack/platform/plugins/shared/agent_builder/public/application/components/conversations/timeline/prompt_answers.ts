/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { TimelineEventType, isAskUserQuestionStep } from '@kbn/agent-builder-common';
import type { AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPromptResponse } from '@kbn/agent-builder-common/agents';
import type { TimelineDisplayEvent } from '../../../../services/events';

export type QuestionAnswers = Map<string, AskUserQuestionAnswer[]>;

/** The answers a human gave, keyed by prompt id. Last write wins (later events override earlier). */
export const answersByPromptId = (events: TimelineDisplayEvent[]): QuestionAnswers => {
  const answers: QuestionAnswers = new Map();
  for (const event of events) {
    if (event.type !== TimelineEventType.promptResponse) {
      continue;
    }
    for (const [promptId, response] of Object.entries(event.data.responses)) {
      if (isAskUserQuestionPromptResponse(response)) {
        answers.set(promptId, response.answers);
      }
    }
  }
  return answers;
};

/**
 * Joins a human's answers onto the question step. A question step is saved unanswered and never
 * rewritten, so the answers only exist on the `prompt_response` event that resumed the run.
 */
export const withQuestionAnswers = (
  step: ConversationRoundStep,
  answers: QuestionAnswers
): ConversationRoundStep => {
  if (!isAskUserQuestionStep(step) || step.answers !== undefined) {
    return step;
  }
  const given = answers.get(step.prompt_id);
  return given ? { ...step, answers: given } : step;
};
