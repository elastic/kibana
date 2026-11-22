/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { AgentPromptType, type PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import {
  decodePromptSelection,
  encodePromptSelection,
  promptsToNodes,
  resolvedPromptsToNodes,
  PROMPT_RESPONSE_EVENT,
  PROMPT_SUBMIT_EVENT,
} from './prompts';

const confirmation: PromptRequest = {
  type: AgentPromptType.confirmation,
  id: 'c1',
  title: 'Delete index',
  message: 'This deletes `logs-old`.',
  confirm_text: 'Delete',
  cancel_text: 'Keep',
  color: 'danger',
};

const question: PromptRequest = {
  type: AgentPromptType.ask_user_question,
  id: 'q1',
  questions: [
    {
      question: 'Which environment?',
      options: [{ label: 'Production' }, { label: 'Staging' }],
      multi_select: false,
    },
  ],
};

const authorization: PromptRequest = {
  type: AgentPromptType.authorization,
  id: 'a1',
  connector_id: 'connector-1',
  connector_name: 'GitHub',
  connector_type: '.github',
  auth_method: 'oauth_authorization_code',
};

describe('promptsToNodes', () => {
  let runtime: KibanaIsomerRuntime;

  beforeAll(async () => {
    runtime = await isomerPluginMock.createStartContract().getRuntime();
  });

  const slackBlocks = (prompts: PromptRequest[]) =>
    runtime.surfaces.slack.render(
      { type: 'view', body: promptsToNodes(prompts, runtime) },
      { heading: false }
    ).blocks as SlackBlock[];

  const elements = (prompts: PromptRequest[]) =>
    slackBlocks(prompts).flatMap((block) => (block.type === 'actions' ? block.elements : []));

  it('renders nothing without prompts', () => {
    expect(promptsToNodes([], runtime)).toEqual([]);
  });

  it('renders a confirmation as its text and two buttons that answer it', () => {
    expect(promptsToNodes([confirmation], runtime)).toEqual([
      { type: 'markdown', text: '**Delete index**\n\nThis deletes `logs-old`.' },
      {
        type: 'actions',
        buttons: [
          {
            label: 'Delete',
            event: { name: PROMPT_RESPONSE_EVENT, context: { p: 'c1', a: true } },
            danger: true,
          },
          { label: 'Keep', event: { name: PROMPT_RESPONSE_EVENT, context: { p: 'c1', a: false } } },
        ],
      },
    ]);
  });

  it('gives Slack buttons whose values decode to the answer', () => {
    expect(elements([confirmation])).toMatchObject([
      { type: 'button', action_id: 'prompt_response:0', style: 'danger' },
      { type: 'button', action_id: 'prompt_response:1' },
    ]);
    expect(
      elements([confirmation]).map((element) =>
        element.type === 'button' ? decodePromptSelection(element.value ?? '') : undefined
      )
    ).toEqual([
      { p: 'c1', a: true },
      { p: 'c1', a: false },
    ]);
  });

  it('falls back to default labels for a confirmation without any', () => {
    const [text, actions] = promptsToNodes(
      [{ type: AgentPromptType.confirmation, id: 'c2' }],
      runtime
    );

    expect(text).toEqual({ type: 'markdown', text: 'Do you want to proceed with this action?' });
    expect(actions).toMatchObject({
      buttons: [{ label: 'Approve', primary: true }, { label: 'Deny' }],
    });
  });

  it('renders a single-choice question as one button per option', () => {
    expect(promptsToNodes([question], runtime)).toEqual([
      { type: 'markdown', text: 'Which environment?' },
      {
        type: 'actions',
        buttons: [
          {
            label: 'Production',
            event: { name: PROMPT_RESPONSE_EVENT, context: { p: 'q1', q: 0, c: 0 } },
          },
          {
            label: 'Staging',
            event: { name: PROMPT_RESPONSE_EVENT, context: { p: 'q1', q: 0, c: 1 } },
          },
        ],
      },
    ]);
  });

  it('renders a multi-select question as checkboxes with a Submit button', () => {
    const multiSelect: PromptRequest = {
      type: AgentPromptType.ask_user_question,
      id: 'q2',
      questions: [
        {
          question: 'Which services?',
          options: [{ label: 'checkout', description: 'Storefront' }, { label: 'payments' }],
          multi_select: true,
        },
      ],
    };

    expect(elements([multiSelect])).toMatchObject([
      {
        type: 'checkboxes',
        action_id: 'prompt_choice_0_0:0',
        options: [
          { value: encodePromptSelection({ p: 'q2', q: 0, c: 0 }) },
          { value: encodePromptSelection({ p: 'q2', q: 0, c: 1 }) },
        ],
      },
      { type: 'button', action_id: `${PROMPT_SUBMIT_EVENT}:0`, style: 'primary' },
    ]);
  });

  it('renders several prompts as choice lists sent by one Submit button', () => {
    expect(elements([confirmation, question])).toMatchObject([
      {
        type: 'radio_buttons',
        action_id: 'prompt_choice_0:0',
        options: [
          { text: { text: 'Delete' }, value: encodePromptSelection({ p: 'c1', a: true }) },
          { text: { text: 'Keep' }, value: encodePromptSelection({ p: 'c1', a: false }) },
        ],
      },
      { type: 'radio_buttons', action_id: 'prompt_choice_1_0:0' },
      { type: 'button', action_id: `${PROMPT_SUBMIT_EVENT}:0` },
    ]);
  });

  it('writes an authorization as text that points to Kibana', () => {
    expect(promptsToNodes([authorization], runtime)).toEqual([
      { type: 'markdown', text: '**GitHub** needs your authorization to continue.' },
      { type: 'markdown', text: 'Open this conversation in Kibana to answer.' },
    ]);
  });

  it('writes every prompt as text when one of them cannot be answered on the surface', () => {
    expect(elements([confirmation, authorization])).toEqual([]);
    expect(promptsToNodes([confirmation, authorization], runtime).at(-1)).toEqual({
      type: 'markdown',
      text: 'Open this conversation in Kibana to answer.',
    });
  });

  it('writes a question with more options than the surface takes as a numbered list', () => {
    const many: PromptRequest = {
      type: AgentPromptType.ask_user_question,
      id: 'q3',
      questions: [
        {
          question: 'Which host?',
          options: Array.from({ length: 11 }, (_, index) => ({ label: `host-${index + 1}` })),
          multi_select: false,
        },
      ],
    };
    const [list, hint] = promptsToNodes([many], runtime);

    expect(list).toMatchObject({ text: expect.stringContaining('Which host?\n\n1. host-1\n') });
    expect(hint).toEqual({
      type: 'markdown',
      text: 'Reply with the number of an option, or with your own answer.',
    });
  });
});

describe('resolvedPromptsToNodes', () => {
  let runtime: KibanaIsomerRuntime;

  beforeAll(async () => {
    runtime = await isomerPluginMock.createStartContract().getRuntime();
  });

  it('shows a confirmation with the answer it got, and no buttons', () => {
    expect(resolvedPromptsToNodes([confirmation], { c1: { allow: false } })).toEqual([
      { type: 'markdown', text: '**Delete index**\n\nThis deletes `logs-old`.' },
      { type: 'context', items: [{ text: 'Answer: Keep' }] },
    ]);
  });

  it('shows each question with the chosen options, a custom answer, or that it was skipped', () => {
    const survey: PromptRequest = {
      type: AgentPromptType.ask_user_question,
      id: 'q2',
      questions: [
        {
          question: 'Which services?',
          options: [{ label: 'checkout' }, { label: 'payments' }],
          multi_select: true,
        },
        { question: 'Which region?', options: [{ label: 'us' }], multi_select: false },
        { question: 'Anything else?', options: [{ label: 'no' }], multi_select: false },
      ],
    };

    expect(
      resolvedPromptsToNodes([survey], {
        q2: { answers: [{ choice: [0, 1] }, { custom: 'ap-south' }, { skipped: true }] },
      })
    ).toEqual([
      { type: 'markdown', text: 'Which services?' },
      { type: 'context', items: [{ text: 'Answer: checkout, payments' }] },
      { type: 'markdown', text: 'Which region?' },
      { type: 'context', items: [{ text: 'Answer: ap-south' }] },
      { type: 'markdown', text: 'Anything else?' },
      { type: 'context', items: [{ text: 'Answer: Skipped' }] },
    ]);
  });

  it('shows an authorization as authorized or declined', () => {
    expect(resolvedPromptsToNodes([authorization], { a1: { authorized: true } }).at(-1)).toEqual({
      type: 'context',
      items: [{ text: 'Answer: Authorized' }],
    });
  });

  it('cuts an answer too long for the surface, so the prompts still render', () => {
    const nodes = resolvedPromptsToNodes([question], {
      q1: { answers: [{ custom: 'x'.repeat(5000) }] },
    });

    expect(runtime.validate({ type: 'view', body: nodes }).valid).toBe(true);
    expect(nodes.at(-1)).toMatchObject({
      items: [{ text: expect.stringMatching(/^Answer: x+…$/) }],
    });
  });

  it('shows a prompt without a response as it was asked', () => {
    expect(resolvedPromptsToNodes([confirmation], {})).toEqual([
      { type: 'markdown', text: '**Delete index**\n\nThis deletes `logs-old`.' },
    ]);
  });
});

describe('decodePromptSelection', () => {
  it('reads what encodePromptSelection wrote', () => {
    expect(decodePromptSelection(encodePromptSelection({ p: 'c1', a: false }))).toEqual({
      p: 'c1',
      a: false,
    });
    expect(decodePromptSelection(encodePromptSelection({ p: 'q1', q: 1, c: 2 }))).toEqual({
      p: 'q1',
      q: 1,
      c: 2,
    });
  });

  it.each(['', 'yes', 'null', '{}', '{"p":1,"a":true}', '{"p":"q1","q":-1,"c":0}', '{"p":"q1"}'])(
    'ignores %p',
    (value) => {
      expect(decodePromptSelection(value)).toBeUndefined();
    }
  );
});
