/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTemperatureIfValid } from './get_temperature';
import { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';

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
        modelName: 'gpt-fake-o1',
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
    ['o1', 'o1-pro', 'o3', 'o1-mini', 'o3-mini'].forEach((model) => {
      expect(getTemperatureIfValid(0.7, { connector: OPENAI_CONNECTOR, modelName: model })).toEqual(
        {}
      );
    });
  });
});
