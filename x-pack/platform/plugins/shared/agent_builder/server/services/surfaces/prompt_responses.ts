/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AskUserQuestionAnswer,
  AskUserQuestionPrompt,
  ConfirmationPrompt,
  PromptRequest,
  PromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';
import {
  isAskUserQuestionPrompt,
  isConfirmationPrompt,
} from '@kbn/agent-builder-common/agents/prompts';
import { decodePromptSelection, type PromptSelection } from './prompts';

// Kept short on purpose: a passing remark in the thread must not read as an approval.
const YES = ['yes', 'approve', 'approved', 'confirm', 'confirmed'];
const NO = ['no', 'deny', 'denied', 'cancel', 'reject', 'rejected'];

/** The longest custom answer the converse API accepts. */
const CUSTOM_ANSWER_MAX_LENGTH = 20000;

const normalize = (text: string): string =>
  text
    .trim()
    .replace(/^[*_`"']+|[*_`"'.!]+$/g, '')
    .toLowerCase();

const confirmationFromText = (
  { confirm_text: confirm, cancel_text: cancel }: ConfirmationPrompt,
  text: string
): PromptResponse | undefined => {
  const reply = normalize(text);

  if (YES.includes(reply) || (confirm !== undefined && reply === normalize(confirm))) {
    return { allow: true };
  }
  if (NO.includes(reply) || (cancel !== undefined && reply === normalize(cancel))) {
    return { allow: false };
  }
  return undefined;
};

/** An option by its number or its label, otherwise the reply as a custom answer. */
const answerFromText = (
  { options }: AskUserQuestionPrompt['questions'][number],
  text: string
): AskUserQuestionAnswer => {
  const reply = normalize(text);
  const byNumber = /^\d+$/.test(reply) ? Number(reply) - 1 : -1;
  const byLabel = options.findIndex(({ label }) => normalize(label) === reply);
  const choice = byNumber >= 0 && byNumber < options.length ? byNumber : byLabel;

  return choice >= 0
    ? { choice: [choice] }
    : { custom: text.trim().slice(0, CUSTOM_ANSWER_MAX_LENGTH) };
};

const responseFromText = (prompts: PromptRequest[], text: string): PromptResponse | undefined => {
  const [prompt] = prompts;

  if (prompts.length !== 1 || text.trim() === '') {
    return undefined;
  }
  if (isConfirmationPrompt(prompt)) {
    return confirmationFromText(prompt, text);
  }
  if (isAskUserQuestionPrompt(prompt) && prompt.questions.length === 1) {
    return { answers: [answerFromText(prompt.questions[0], text)] };
  }
  return undefined;
};

const answerFromSelections = (
  { options, multi_select: multiSelect }: AskUserQuestionPrompt['questions'][number],
  selections: PromptSelection[]
): AskUserQuestionAnswer => {
  const chosen = [
    ...new Set(selections.flatMap(({ c }) => (c !== undefined && c < options.length ? [c] : []))),
  ].sort((a, b) => a - b);

  if (chosen.length === 0) {
    return { skipped: true };
  }
  return { choice: multiSelect ? chosen : chosen.slice(0, 1) };
};

const responseFromSelections = (
  prompt: PromptRequest,
  selections: PromptSelection[]
): PromptResponse | undefined => {
  if (selections.length === 0) {
    return undefined;
  }
  if (isConfirmationPrompt(prompt)) {
    const allow = selections.find(({ a }) => a !== undefined)?.a;

    return allow === undefined ? undefined : { allow };
  }
  if (isAskUserQuestionPrompt(prompt)) {
    return {
      answers: prompt.questions.map((question, index) =>
        answerFromSelections(
          question,
          selections.filter(({ q }) => q === index)
        )
      ),
    };
  }
  return undefined;
};

/**
 * Turns what a reader did on a surface into the responses that resume a paused round: the options
 * they chose (`selections`, as written by `encodePromptSelection`), or failing that their reply in
 * the thread (`text`), which can only answer a round with a single prompt.
 *
 * @returns A response for every pending prompt, or nothing when any of them is left unanswered.
 */
export const resolvePromptResponses = ({
  prompts,
  selections = [],
  text,
}: {
  prompts: PromptRequest[];
  selections?: string[];
  text?: string;
}): Record<string, PromptResponse> | undefined => {
  const decoded = selections.flatMap((value) => decodePromptSelection(value) ?? []);

  if (decoded.length === 0) {
    const response = text === undefined ? undefined : responseFromText(prompts, text);

    return response ? { [prompts[0].id]: response } : undefined;
  }

  const responses = prompts.flatMap((prompt): Array<[string, PromptResponse]> => {
    const response = responseFromSelections(
      prompt,
      decoded.filter(({ p }) => p === prompt.id)
    );

    return response ? [[prompt.id, response]] : [];
  });

  return responses.length === prompts.length ? Object.fromEntries(responses) : undefined;
};
