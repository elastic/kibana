/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType, type PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { resolvePromptResponses } from './prompt_responses';
import { encodePromptSelection } from './prompts';

const confirmation: PromptRequest = {
  type: AgentPromptType.confirmation,
  id: 'c1',
  confirm_text: 'Delete',
  cancel_text: 'Keep',
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

const survey: PromptRequest = {
  type: AgentPromptType.ask_user_question,
  id: 'q2',
  questions: [
    {
      question: 'Which services?',
      options: [{ label: 'checkout' }, { label: 'payments' }, { label: 'search' }],
      multi_select: true,
    },
    { question: 'Which region?', options: [{ label: 'us' }, { label: 'eu' }], multi_select: false },
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

describe('resolvePromptResponses', () => {
  describe('from selections', () => {
    it('answers a confirmation', () => {
      expect(
        resolvePromptResponses({
          prompts: [confirmation],
          selections: [encodePromptSelection({ p: 'c1', a: false })],
        })
      ).toEqual({ c1: { allow: false } });
    });

    it('answers each question with its chosen options, and skips the ones left empty', () => {
      expect(
        resolvePromptResponses({
          prompts: [survey],
          selections: [
            encodePromptSelection({ p: 'q2', q: 0, c: 2 }),
            encodePromptSelection({ p: 'q2', q: 0, c: 0 }),
          ],
        })
      ).toEqual({ q2: { answers: [{ choice: [0, 2] }, { skipped: true }] } });
    });

    it('keeps one option of a single-choice question, and none out of range', () => {
      expect(
        resolvePromptResponses({
          prompts: [question],
          selections: [
            encodePromptSelection({ p: 'q1', q: 0, c: 9 }),
            encodePromptSelection({ p: 'q1', q: 0, c: 1 }),
            encodePromptSelection({ p: 'q1', q: 0, c: 0 }),
          ],
        })
      ).toEqual({ q1: { answers: [{ choice: [0] }] } });
    });

    it('answers several prompts at once, ignoring prompts that are not pending', () => {
      expect(
        resolvePromptResponses({
          prompts: [confirmation, question],
          selections: [
            encodePromptSelection({ p: 'c1', a: true }),
            encodePromptSelection({ p: 'q1', q: 0, c: 1 }),
            encodePromptSelection({ p: 'other', a: true }),
          ],
        })
      ).toEqual({ c1: { allow: true }, q1: { answers: [{ choice: [1] }] } });
    });

    it('resolves nothing when a pending prompt is left unanswered', () => {
      expect(
        resolvePromptResponses({
          prompts: [confirmation, question],
          selections: [encodePromptSelection({ p: 'c1', a: true })],
        })
      ).toBeUndefined();
      expect(
        resolvePromptResponses({
          prompts: [authorization],
          selections: [encodePromptSelection({ p: 'a1', a: true })],
        })
      ).toBeUndefined();
    });
  });

  describe('from a reply', () => {
    it.each([
      ['yes', true],
      ['Yes.', true],
      ['*approve*', true],
      ['delete', true],
      ['no', false],
      ['Keep', false],
    ])('answers a confirmation with %p', (text, allow) => {
      expect(resolvePromptResponses({ prompts: [confirmation], text })).toEqual({ c1: { allow } });
    });

    it('does not guess a confirmation from anything else', () => {
      expect(resolvePromptResponses({ prompts: [confirmation], text: 'maybe later' })).toBe(
        undefined
      );
    });

    it('answers a question by option number, by label, or with a custom answer', () => {
      expect(resolvePromptResponses({ prompts: [question], text: '2' })).toEqual({
        q1: { answers: [{ choice: [1] }] },
      });
      expect(resolvePromptResponses({ prompts: [question], text: 'production' })).toEqual({
        q1: { answers: [{ choice: [0] }] },
      });
      expect(resolvePromptResponses({ prompts: [question], text: ' The dev cluster ' })).toEqual({
        q1: { answers: [{ custom: 'The dev cluster' }] },
      });
      expect(resolvePromptResponses({ prompts: [question], text: '7' })).toEqual({
        q1: { answers: [{ custom: '7' }] },
      });
    });

    it('resolves nothing for several prompts or questions, an authorization, or an empty reply', () => {
      expect(resolvePromptResponses({ prompts: [confirmation, question], text: 'yes' })).toBe(
        undefined
      );
      expect(resolvePromptResponses({ prompts: [survey], text: 'us' })).toBeUndefined();
      expect(resolvePromptResponses({ prompts: [authorization], text: 'yes' })).toBeUndefined();
      expect(resolvePromptResponses({ prompts: [question], text: '  ' })).toBeUndefined();
    });

    it('is not used when there are selections', () => {
      expect(
        resolvePromptResponses({
          prompts: [confirmation],
          selections: [encodePromptSelection({ p: 'c1', a: false })],
          text: 'yes',
        })
      ).toEqual({ c1: { allow: false } });
    });
  });
});
