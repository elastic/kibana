/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolChoiceType } from '@kbn/inference-common';
import { resolveToolChoice, supportsForcedToolChoice } from './forced_tool_choice';

describe('supportsForcedToolChoice', () => {
  [
    'claude-sonnet-4-5',
    'anthropic-claude-4.6-sonnet',
    'us.anthropic.claude-opus-4-1-v1:0',
    'claude-opus-4.8',
    'claude-sonnet-5',
    'claude-opus-5',
    'anthropic-claude-5-fable',
    'claude-3-5-sonnet-20241022',
  ].forEach((modelId) => {
    it(`returns true for a Claude model that accepts forced tool choice: ${modelId}`, () => {
      expect(supportsForcedToolChoice(modelId)).toBe(true);
    });
  });

  [
    'eu.anthropic.claude-sonnet-5-5',
    'eu.anthropic.claude-opus-5-5',
    'anthropic-claude-5.5-sonnet',
    '.anthropic-claude-5.5-opus-chat_completion',
    'claude-fable-5-1',
    'anthropic-claude-5.1-mythos',
    'claude-haiku-5-5',
    'claude-sonnet-6',
    'claude-unknown-variant',
  ].forEach((modelId) => {
    it(`returns false for a Claude model that rejects or is not known to accept it: ${modelId}`, () => {
      expect(supportsForcedToolChoice(modelId)).toBe(false);
    });
  });

  ['gpt-5', 'gemini-2.5-pro', 'openai/gpt-4.1', 'other-provider/model-5'].forEach((modelId) => {
    it(`returns true for a non-Claude model: ${modelId}`, () => {
      expect(supportsForcedToolChoice(modelId)).toBe(true);
    });
  });

  it('returns true when the model id is unknown', () => {
    expect(supportsForcedToolChoice(undefined)).toBe(true);
    expect(supportsForcedToolChoice('')).toBe(true);
  });
});

describe('resolveToolChoice', () => {
  const rejectingModel = 'eu.anthropic.claude-sonnet-5-5';
  const acceptingModel = 'anthropic-claude-4.6-sonnet';

  it('downgrades `required` to `auto` for a model that rejects forced tool choice', () => {
    expect(
      resolveToolChoice({ toolChoice: ToolChoiceType.required, modelId: rejectingModel })
    ).toBe(ToolChoiceType.auto);
  });

  it('downgrades a named function to `auto` for a model that rejects forced tool choice', () => {
    expect(
      resolveToolChoice({ toolChoice: { function: 'set_title' }, modelId: rejectingModel })
    ).toBe(ToolChoiceType.auto);
  });

  it('keeps a forced tool choice for a model that accepts it', () => {
    expect(
      resolveToolChoice({ toolChoice: ToolChoiceType.required, modelId: acceptingModel })
    ).toBe(ToolChoiceType.required);
    expect(
      resolveToolChoice({ toolChoice: { function: 'set_title' }, modelId: acceptingModel })
    ).toEqual({ function: 'set_title' });
  });

  it('keeps a forced tool choice for a non-Claude model', () => {
    expect(resolveToolChoice({ toolChoice: { function: 'set_title' }, modelId: 'gpt-5' })).toEqual({
      function: 'set_title',
    });
  });

  it('keeps a forced tool choice when the model id is unknown', () => {
    expect(resolveToolChoice({ toolChoice: ToolChoiceType.required })).toBe(
      ToolChoiceType.required
    );
  });

  [ToolChoiceType.auto, ToolChoiceType.none, undefined].forEach((toolChoice) => {
    it(`leaves ${toolChoice} unchanged for a model that rejects forced tool choice`, () => {
      expect(resolveToolChoice({ toolChoice, modelId: rejectingModel })).toBe(toolChoice);
    });
  });

  it('logs at debug when downgrading', () => {
    const logger = loggerMock.create();

    resolveToolChoice({ toolChoice: { function: 'set_title' }, modelId: rejectingModel, logger });
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('does not support forced tool choice')
    );

    logger.debug.mockClear();
    resolveToolChoice({ toolChoice: { function: 'set_title' }, modelId: acceptingModel, logger });
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
