/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { materializeAskUserQuestionToolCall } from './ask_user_question_tool_call';

const colorQuestion = {
  question: 'Pick a color',
  options: [{ label: 'red' }, { label: 'blue' }, { label: 'green' }],
  multi_select: false,
};

const hobbiesQuestion = {
  question: 'Hobbies?',
  options: [{ label: 'Reading' }, { label: 'Gaming' }, { label: 'Cooking' }],
  multi_select: true,
};

describe('materializeAskUserQuestionToolCall', () => {
  it('produces a fresh toolCallId and the correct toolName + args', () => {
    const { toolCallId, toolName, args } = materializeAskUserQuestionToolCall({
      questions: [colorQuestion],
      answers: [{ choice: [0] }],
    });
    expect(toolCallId).toEqual(expect.any(String));
    expect(toolCallId.length).toBeGreaterThan(0);
    expect(toolName).toBe('ask_user_question');
    expect(args).toEqual({ questions: [colorQuestion] });
  });

  it('produces fresh toolCallIds on each call', () => {
    const a = materializeAskUserQuestionToolCall({
      questions: [colorQuestion],
      answers: [{ choice: [0] }],
    });
    const b = materializeAskUserQuestionToolCall({
      questions: [colorQuestion],
      answers: [{ choice: [0] }],
    });
    expect(a.toolCallId).not.toEqual(b.toolCallId);
  });

  it('keeps the artifact as the canonical indices form', () => {
    const { artifact } = materializeAskUserQuestionToolCall({
      questions: [colorQuestion],
      answers: [{ choice: [1] }],
    });
    expect(artifact).toEqual({ answers: [{ choice: [1] }] });
  });

  describe('content denormalization', () => {
    it('resolves choice indices to option labels', () => {
      const { content } = materializeAskUserQuestionToolCall({
        questions: [colorQuestion],
        answers: [{ choice: [0] }],
      });
      expect(JSON.parse(content)).toEqual({
        answers: [{ question: 'Pick a color', selected_options: ['red'] }],
      });
    });

    it('resolves multi-select choice indices', () => {
      const { content } = materializeAskUserQuestionToolCall({
        questions: [hobbiesQuestion],
        answers: [{ choice: [0, 2] }],
      });
      expect(JSON.parse(content)).toEqual({
        answers: [{ question: 'Hobbies?', selected_options: ['Reading', 'Cooking'] }],
      });
    });

    it('includes the custom field when present and non-empty', () => {
      const { content } = materializeAskUserQuestionToolCall({
        questions: [colorQuestion],
        answers: [{ choice: [0], custom: 'rainy red' }],
      });
      expect(JSON.parse(content)).toEqual({
        answers: [{ question: 'Pick a color', selected_options: ['red'], custom: 'rainy red' }],
      });
    });

    it('renders skipped: true with empty selected_options and no custom', () => {
      const { content } = materializeAskUserQuestionToolCall({
        questions: [colorQuestion],
        answers: [{ skipped: true }],
      });
      expect(JSON.parse(content)).toEqual({
        answers: [{ question: 'Pick a color', selected_options: [], skipped: true }],
      });
    });

    it('renders an empty selected_options when only custom is provided', () => {
      const { content } = materializeAskUserQuestionToolCall({
        questions: [colorQuestion],
        answers: [{ custom: 'pink' }],
      });
      expect(JSON.parse(content)).toEqual({
        answers: [{ question: 'Pick a color', selected_options: [], custom: 'pink' }],
      });
    });

    it('handles multiple questions in order', () => {
      const { content } = materializeAskUserQuestionToolCall({
        questions: [colorQuestion, hobbiesQuestion],
        answers: [{ choice: [2] }, { choice: [1], custom: 'painting' }],
      });
      expect(JSON.parse(content)).toEqual({
        answers: [
          { question: 'Pick a color', selected_options: ['green'] },
          { question: 'Hobbies?', selected_options: ['Gaming'], custom: 'painting' },
        ],
      });
    });

    it('omits an empty custom string', () => {
      const { content } = materializeAskUserQuestionToolCall({
        questions: [colorQuestion],
        answers: [{ choice: [0], custom: '' }],
      });
      expect(JSON.parse(content)).toEqual({
        answers: [{ question: 'Pick a color', selected_options: ['red'] }],
      });
    });
  });
});
