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
