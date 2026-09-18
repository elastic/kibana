/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import { classifyCustomContentMode } from './classify_custom_content_mode';

const mockOutput = jest.fn();
const selectModel = jest.fn().mockResolvedValue({
  inferenceClient: { output: mockOutput },
});
const getDefaultModel = jest.fn();

const modelProvider = {
  selectModel,
  getDefaultModel,
} as unknown as ModelProvider;

beforeEach(() => {
  jest.clearAllMocks();
  selectModel.mockResolvedValue({
    inferenceClient: { output: mockOutput },
  });
});

describe('classifyCustomContentMode', () => {
  it('runs on the low-effort model, not the default', async () => {
    mockOutput.mockResolvedValue({ output: { mode: 'static' } });

    await classifyCustomContentMode({
      prompt: 'A header banner reading Production overview',
      modelProvider,
    });

    expect(selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });
    expect(getDefaultModel).not.toHaveBeenCalled();
  });

  it('returns static when the model classifies the prompt as having no data', async () => {
    mockOutput.mockResolvedValue({ output: { mode: 'static' } });

    await expect(
      classifyCustomContentMode({
        prompt: 'A header banner reading Production overview',
        modelProvider,
      })
    ).resolves.toBe('static');
  });

  it('returns data when the model classifies the prompt as needing live values', async () => {
    mockOutput.mockResolvedValue({ output: { mode: 'data' } });

    await expect(
      classifyCustomContentMode({
        prompt: 'A status board with one card per host showing its log count',
        modelProvider,
      })
    ).resolves.toBe('data');
  });

  it('propagates model call failures so the caller can choose a fallback', async () => {
    mockOutput.mockRejectedValue(new Error('connector timeout'));

    await expect(
      classifyCustomContentMode({ prompt: 'A status board per host', modelProvider })
    ).rejects.toThrow('connector timeout');
  });

  it.each([
    ['an unknown mode', { output: { mode: 'maybe' } }],
    ['missing output', {}],
    ['missing mode', { output: {} }],
  ])('returns data when the structured output is %s', async (_label, response) => {
    mockOutput.mockResolvedValue(response);

    await expect(
      classifyCustomContentMode({ prompt: 'Show something', modelProvider })
    ).resolves.toBe('data');
  });
});
