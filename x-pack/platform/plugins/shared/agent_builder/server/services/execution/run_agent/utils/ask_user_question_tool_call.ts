/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { internalTools } from '@kbn/agent-builder-common';
import type {
  AskUserQuestionAnswer,
  AskUserQuestionItem,
} from '@kbn/agent-builder-common/agents/prompts';

export interface AskUserQuestionToolCallParts {
  toolCallId: string;
  toolName: string;
  args: { questions: AskUserQuestionItem[] };
  artifact: { answers: AskUserQuestionAnswer[] };
  /** what the LLM reads as the tool result. */
  content: string;
}

export interface DenormalizedAnswer {
  question: string;
  selected_options: string[];
  custom?: string;
  skipped?: boolean;
}

export const materializeAskUserQuestionToolCall = ({
  questions,
  answers,
}: {
  questions: AskUserQuestionItem[];
  answers: AskUserQuestionAnswer[];
}): AskUserQuestionToolCallParts => ({
  toolCallId: uuidv4(),
  toolName: internalTools.askUserQuestion,
  args: { questions },
  content: JSON.stringify({ answers: denormalizeAnswers(questions, answers) }),
  artifact: { answers },
});

/**
 * Denormalize answer shape rendered into the tool-result content so the LLM sees a self-contained result
 */
const denormalizeAnswers = (
  questions: AskUserQuestionItem[],
  answers: AskUserQuestionAnswer[]
): DenormalizedAnswer[] => {
  return answers.map((answer, idx) => {
    const question = questions[idx];
    const selectedOptions =
      answer.choice
        ?.map((choiceIdx) => question.options[choiceIdx]?.label)
        .filter((label): label is string => label != null) ?? [];
    const out: DenormalizedAnswer = {
      question: question.question,
      selected_options: selectedOptions,
    };
    if (answer.custom != null && answer.custom !== '') {
      out.custom = answer.custom;
    }
    if (answer.skipped === true) {
      out.skipped = true;
    }
    return out;
  });
};
