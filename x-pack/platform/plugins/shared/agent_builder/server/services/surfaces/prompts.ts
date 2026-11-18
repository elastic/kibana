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
  isAskUserQuestionPromptResponse,
  isAuthorizationPrompt,
  isAuthorizationPromptResponse,
  isConfirmationPrompt,
  isConfirmationPromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';
import { i18n } from '@kbn/i18n';
import type { ComponentsNode } from '@kbn/isomer-components';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';

/** Event of a button that answers the round's only prompt on click. */
export const PROMPT_RESPONSE_EVENT = 'prompt_response';

/** Event of the button that submits the options chosen for every prompt of the round. */
export const PROMPT_SUBMIT_EVENT = 'prompt_submit';

const PROMPT_CHOICE_EVENT = 'prompt_choice';

/** Slack's limit of buttons in one row, which the `actions` primitive enforces. */
const MAX_BUTTONS = 5;

/**
 * One answer a reader gave on a surface: the prompt (`p`), and either the confirmation (`a`) or
 * an option (`c`) of a question (`q`). Surfaces carry it as an opaque string.
 */
export interface PromptSelection {
  p: string;
  a?: boolean;
  q?: number;
  c?: number;
}

export const encodePromptSelection = (selection: PromptSelection): string =>
  JSON.stringify(selection);

const isIndex = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;

/** Reads a value written by {@link encodePromptSelection}, or nothing when it isn't one. */
export const decodePromptSelection = (value: string): PromptSelection | undefined => {
  try {
    const { p, a, q, c } = JSON.parse(value) ?? {};

    if (typeof p !== 'string') {
      return undefined;
    }
    if (typeof a === 'boolean') {
      return { p, a };
    }
    return isIndex(q) && isIndex(c) ? { p, q, c } : undefined;
  } catch {
    return undefined;
  }
};

const labels = {
  confirmationMessage: i18n.translate('xpack.agentBuilder.surfaces.prompts.confirmationMessage', {
    defaultMessage: 'Do you want to proceed with this action?',
  }),
  confirm: i18n.translate('xpack.agentBuilder.surfaces.prompts.confirm', {
    defaultMessage: 'Approve',
  }),
  cancel: i18n.translate('xpack.agentBuilder.surfaces.prompts.cancel', {
    defaultMessage: 'Deny',
  }),
  submit: i18n.translate('xpack.agentBuilder.surfaces.prompts.submit', {
    defaultMessage: 'Submit',
  }),
  replyToConfirm: i18n.translate('xpack.agentBuilder.surfaces.prompts.replyToConfirm', {
    defaultMessage: 'Reply *yes* or *no*.',
  }),
  replyToAnswer: i18n.translate('xpack.agentBuilder.surfaces.prompts.replyToAnswer', {
    defaultMessage: 'Reply with the number of an option, or with your own answer.',
  }),
  answerInKibana: i18n.translate('xpack.agentBuilder.surfaces.prompts.answerInKibana', {
    defaultMessage: 'Open this conversation in Kibana to answer.',
  }),
  skipped: i18n.translate('xpack.agentBuilder.surfaces.prompts.skipped', {
    defaultMessage: 'Skipped',
  }),
  authorized: i18n.translate('xpack.agentBuilder.surfaces.prompts.authorized', {
    defaultMessage: 'Authorized',
  }),
  declined: i18n.translate('xpack.agentBuilder.surfaces.prompts.declined', {
    defaultMessage: 'Declined',
  }),
  answer: (answer: string) =>
    i18n.translate('xpack.agentBuilder.surfaces.prompts.answer', {
      defaultMessage: 'Answer: {answer}',
      values: { answer },
    }),
  authorization: (connectorName: string) =>
    i18n.translate('xpack.agentBuilder.surfaces.prompts.authorization', {
      defaultMessage: '**{connectorName}** needs your authorization to continue.',
      values: { connectorName },
    }),
};

type Question = AskUserQuestionPrompt['questions'][number];

const markdown = (...paragraphs: Array<string | undefined>): ComponentsNode => ({
  type: 'markdown',
  text: paragraphs.filter((paragraph) => paragraph).join('\n\n'),
});

const confirmationText = ({ title, message }: ConfirmationPrompt): ComponentsNode =>
  markdown(title && `**${title}**`, message ?? (title ? undefined : labels.confirmationMessage));

const confirmationLabels = ({
  confirm_text: confirm,
  cancel_text: cancel,
}: ConfirmationPrompt) => ({
  confirm: confirm ?? labels.confirm,
  cancel: cancel ?? labels.cancel,
});

const optionsList = ({ options }: Question): string =>
  options
    .map(({ label, description }, index) =>
      description ? `${index + 1}. ${label} — ${description}` : `${index + 1}. ${label}`
    )
    .join('\n');

/** Buttons that answer on click, for a round whose only prompt takes a single click. */
const buttonNodes = (prompt: PromptRequest): ComponentsNode[] | undefined => {
  if (isConfirmationPrompt(prompt)) {
    const { confirm, cancel } = confirmationLabels(prompt);
    const event = (allow: boolean) => ({
      name: PROMPT_RESPONSE_EVENT,
      context: { p: prompt.id, a: allow },
    });

    return [
      confirmationText(prompt),
      {
        type: 'actions',
        buttons: [
          {
            label: confirm,
            event: event(true),
            ...(prompt.color === 'danger' ? { danger: true } : { primary: true }),
          },
          { label: cancel, event: event(false) },
        ],
      },
    ];
  }

  if (!isAskUserQuestionPrompt(prompt) || prompt.questions.length !== 1) {
    return undefined;
  }

  const [{ question, options, multi_select: multiSelect }] = prompt.questions;
  const fitsButtons =
    !multiSelect &&
    options.length > 0 &&
    options.length <= MAX_BUTTONS &&
    options.every(({ description }) => !description);

  return fitsButtons
    ? [
        markdown(question),
        {
          type: 'actions',
          buttons: options.map(({ label }, index) => ({
            label,
            event: { name: PROMPT_RESPONSE_EVENT, context: { p: prompt.id, q: 0, c: index } },
          })),
        },
      ]
    : undefined;
};

/** Choice lists, answered together with the round's Submit button. */
const choiceNodes = (prompt: PromptRequest, promptIndex: number): ComponentsNode[] | undefined => {
  if (isConfirmationPrompt(prompt)) {
    const { confirm, cancel } = confirmationLabels(prompt);

    return [
      confirmationText(prompt),
      {
        type: 'choices',
        name: `${PROMPT_CHOICE_EVENT}_${promptIndex}`,
        options: [
          { label: confirm, value: encodePromptSelection({ p: prompt.id, a: true }) },
          { label: cancel, value: encodePromptSelection({ p: prompt.id, a: false }) },
        ],
      },
    ];
  }

  if (!isAskUserQuestionPrompt(prompt)) {
    return undefined;
  }

  return prompt.questions.flatMap(
    ({ question, options, multi_select: multiSelect }, questionIndex): ComponentsNode[] => [
      markdown(question),
      {
        type: 'choices',
        name: `${PROMPT_CHOICE_EVENT}_${promptIndex}_${questionIndex}`,
        ...(multiSelect ? { multiple: true } : {}),
        options: options.map(({ label, description }, optionIndex) => ({
          label,
          ...(description ? { description } : {}),
          value: encodePromptSelection({ p: prompt.id, q: questionIndex, c: optionIndex }),
        })),
      },
    ]
  );
};

/** The prompt as text, with how to answer it when a reply in the thread can. */
const textNodes = (prompt: PromptRequest, { replyAnswers }: { replyAnswers: boolean }) => {
  if (isConfirmationPrompt(prompt)) {
    return [confirmationText(prompt), ...(replyAnswers ? [markdown(labels.replyToConfirm)] : [])];
  }

  if (isAuthorizationPrompt(prompt)) {
    return [markdown(labels.authorization(prompt.connector_name))];
  }

  const canReply = replyAnswers && prompt.questions.length === 1;

  return [
    ...prompt.questions.map((question) => markdown(question.question, optionsList(question))),
    ...(canReply ? [markdown(labels.replyToAnswer)] : []),
  ];
};

/** Whether a reply in the thread can answer the round: it has one prompt, which text can answer. */
const canReplyAnswer = (prompts: PromptRequest[]): boolean => {
  const [prompt] = prompts;

  return (
    prompts.length === 1 &&
    (isConfirmationPrompt(prompt) ||
      (isAskUserQuestionPrompt(prompt) && prompt.questions.length === 1))
  );
};

/**
 * The nodes that ask a paused round's prompts on a surface.
 *
 * A single prompt one click can answer gets buttons. Otherwise every prompt gets choice lists,
 * sent together by one Submit button, since a resume must answer every pending prompt. When a
 * prompt can't be answered that way (an authorization, or options past the surface's limits),
 * the prompts are written as text.
 */
export const promptsToNodes = (
  prompts: PromptRequest[],
  runtime: KibanaIsomerRuntime
): ComponentsNode[] => {
  const valid = (nodes: ComponentsNode[] | undefined): nodes is ComponentsNode[] =>
    nodes !== undefined && runtime.validate({ type: 'view', body: nodes }).valid;

  if (prompts.length === 0) {
    return [];
  }

  const buttons = prompts.length === 1 ? buttonNodes(prompts[0]) : undefined;

  if (valid(buttons)) {
    return buttons;
  }

  const choices = prompts.map(choiceNodes);

  if (choices.every(valid)) {
    return [
      ...choices.flat(),
      {
        type: 'actions',
        buttons: [{ label: labels.submit, event: { name: PROMPT_SUBMIT_EVENT }, primary: true }],
      },
    ];
  }

  const replyAnswers = canReplyAnswer(prompts);

  return [
    ...prompts.flatMap((prompt) => textNodes(prompt, { replyAnswers })),
    ...(replyAnswers ? [] : [markdown(labels.answerInKibana)]),
  ];
};

/** The longest answer shown, which with its label fits a `context` item. */
const ANSWER_MAX_LENGTH = 400;

const answered = (answer: string): ComponentsNode => ({
  type: 'context',
  items: [
    {
      text: labels.answer(
        answer.length > ANSWER_MAX_LENGTH ? `${answer.slice(0, ANSWER_MAX_LENGTH)}…` : answer
      ),
    },
  ],
});

const answerText = (
  { options }: Question,
  { choice = [], custom }: AskUserQuestionAnswer = {}
): string => {
  const chosen = choice.flatMap((index) => options[index]?.label ?? []);

  return [...chosen, ...(custom ? [custom] : [])].join(', ') || labels.skipped;
};

const resolvedPromptNodes = (
  prompt: PromptRequest,
  response: PromptResponse | undefined
): ComponentsNode[] => {
  if (isConfirmationPrompt(prompt)) {
    const { confirm, cancel } = confirmationLabels(prompt);

    return [
      confirmationText(prompt),
      ...(response && isConfirmationPromptResponse(response)
        ? [answered(response.allow ? confirm : cancel)]
        : []),
    ];
  }

  if (isAuthorizationPrompt(prompt)) {
    return [
      markdown(labels.authorization(prompt.connector_name)),
      ...(response && isAuthorizationPromptResponse(response)
        ? [answered(response.authorized ? labels.authorized : labels.declined)]
        : []),
    ];
  }

  const answers = response && isAskUserQuestionPromptResponse(response) ? response.answers : [];

  return prompt.questions.flatMap((question, index) => [
    markdown(question.question),
    answered(answerText(question, answers[index])),
  ]);
};

/** The nodes that show a round's prompts once they were answered: each with its answer, and nothing to act on. */
export const resolvedPromptsToNodes = (
  prompts: PromptRequest[],
  responses: Record<string, PromptResponse>
): ComponentsNode[] =>
  prompts.flatMap((prompt) => resolvedPromptNodes(prompt, responses[prompt.id]));
