/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTemperatureIfValid } from './get_temperature';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

const OPENAI_CONNECTOR = { type: InferenceConnectorType.OpenAI } as InferenceConnector;
const GEMINI_CONNECTOR = { type: InferenceConnectorType.Gemini } as InferenceConnector;
describe('getTemperatureIfValid', () => {
  it('returns an empty object if temperature is undefined', () => {
    expect(
      getTemperatureIfValid(undefined, { connector: OPENAI_CONNECTOR, modelName: 'gpt-3.5-turbo' })
    ).toEqual({});
  });

  it('returns an object with temperature if OpenAI model accepts', () => {
    expect(
      getTemperatureIfValid(0.7, { connector: OPENAI_CONNECTOR, modelName: 'gpt-3.5-turbo' })
    ).toEqual({
      temperature: 0.7,
    });
    expect(
      getTemperatureIfValid(0.7, {
        connector: OPENAI_CONNECTOR,
        modelName: 'gpt-fake',
      })
    ).toEqual({
      temperature: 0.7,
    });
  });

  it('returns an object with temperature if not OpenAI connector', () => {
    expect(
      getTemperatureIfValid(0.7, {
        connector: GEMINI_CONNECTOR,
        modelName: 'gemma',
      })
    ).toEqual({
      temperature: 0.7,
    });
  });

  it("returns an empty object for OpenAI models that don't support temperature", () => {
    [
      'o1',
      'o1-pro',
      'o3',
      'o1-mini',
      'o3-mini',
      'gpt-5',
      'gpt-5.2-chat',
      'openai/gpt-5',
      'llm-gateway/gpt-5.2-chat',
    ].forEach((model) => {
      expect(getTemperatureIfValid(0.7, { connector: OPENAI_CONNECTOR, modelName: model })).toEqual(
        {}
      );
    });
  });

  [
    'claude-sonnet-5',
    'anthropic/claude_fable_5-20260701',
    'anthropic.claude-mythos-5',
    'claude-opus-4.7',
    'us.anthropic.claude-opus-4_8-v1:0',
  ].forEach((modelId) => {
    it(`returns an empty object for unsupported Anthropic model ${modelId}`, () => {
      expect(getTemperatureIfValid(0.7, { provider: 'anthropic', modelId })).toEqual({});
    });
  });

  [
    'claude-sonnet-4-5',
    'claude-opus-4-6',
    'claude-haiku-5',
    'claude-sonnet-50',
    'claude-opus-4.80',
  ].forEach((modelId) => {
    it(`keeps temperature for supported or unrecognized Anthropic model ${modelId}`, () => {
      expect(getTemperatureIfValid(0.7, { provider: 'anthropic', modelId })).toEqual({
        temperature: 0.7,
      });
    });
  });

  it('keeps temperature for unaffected providers with the same model ID', () => {
    expect(
      getTemperatureIfValid(0.7, { provider: 'amazonbedrock', modelId: 'claude-sonnet-5' })
    ).toEqual({
      temperature: 0.7,
    });
  });

  it('uses endpoint model ID rather than the request model name for Anthropic compatibility', () => {
    expect(
      getTemperatureIfValid(0.7, {
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-5',
        modelName: 'claude-sonnet-5',
      })
    ).toEqual({
      temperature: 0.7,
    });
  });

  it('keeps temperature when Anthropic endpoint metadata is incomplete', () => {
    expect(getTemperatureIfValid(0.7, { provider: 'anthropic' })).toEqual({
      temperature: 0.7,
    });
    expect(getTemperatureIfValid(0.7, { modelId: 'claude-sonnet-5' })).toEqual({
      temperature: 0.7,
    });
  });

  it('keeps connector-config temperature even for excluded models (escape hatch)', () => {
    const connector = {
      type: InferenceConnectorType.OpenAI,
      config: { temperature: 0.25 },
    } as unknown as InferenceConnector;

    expect(
      getTemperatureIfValid(undefined, { connector, modelName: 'llm-gateway/gpt-5.2-chat' })
    ).toEqual({
      temperature: 0.25,
    });
  });

  it('uses connector-config temperature when model supports it (including 0)', () => {
    const connectorZero = {
      type: InferenceConnectorType.OpenAI,
      config: { temperature: 0 },
    } as unknown as InferenceConnector;

    expect(
      getTemperatureIfValid(undefined, { connector: connectorZero, modelName: 'gpt-4' })
    ).toEqual({
      temperature: 0,
    });

    const connectorNonZero = {
      type: InferenceConnectorType.OpenAI,
      config: { temperature: 0.25 },
    } as unknown as InferenceConnector;

    expect(
      getTemperatureIfValid(undefined, { connector: connectorNonZero, modelName: 'gpt-4' })
    ).toEqual({
      temperature: 0.25,
    });
  });
});
