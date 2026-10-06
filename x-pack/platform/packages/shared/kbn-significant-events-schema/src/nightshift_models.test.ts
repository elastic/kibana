/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { NightshiftModelBlockedError } from './nightshift_model_blocked_error';
import { NightshiftModelNotFoundError } from './nightshift_model_not_found_error';
import { NIGHTSHIFT_DEFAULT_MODELS } from './nightshift_models';

describe('NIGHTSHIFT_DEFAULT_MODELS', () => {
  it('pins each Nightshift step to its recommended default inference endpoint', () => {
    expect(NIGHTSHIFT_DEFAULT_MODELS).toEqual({
      discovery: defaultInferenceEndpoints.OPENAI_GPT_5_4,
      investigation: defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
      kiExtraction: defaultInferenceEndpoints.OPENAI_GPT_5_4,
      kiQueryGeneration: defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
    });
  });
});

describe('Nightshift model errors', () => {
  it('names a model that was not found and gives a valid example', () => {
    expect(new NightshiftModelNotFoundError('missing-model').message).toBe(
      'Model "missing-model" was not found. Pass a chat model connector or inference endpoint id, for example ".anthropic-claude-4.6-sonnet-chat_completion".'
    );
  });

  it('names the restriction, selected model, and allowed default', () => {
    expect(new NightshiftModelBlockedError('selected-model', 'default-model').message).toBe(
      `Nightshift can't use model "selected-model": the GenAI setting "Default connector only" (genAiSettings:defaultAIConnectorOnly) only allows "default-model". Turn that setting off, or run with "default-model" as the model.`
    );
  });

  it('explains that every model is blocked when no default is configured', () => {
    expect(new NightshiftModelBlockedError('selected-model').message).toBe(
      `Nightshift can't use model "selected-model": the GenAI setting "Default connector only" (genAiSettings:defaultAIConnectorOnly) is on but no default AI connector is set, so every model is blocked. Set a default AI connector or turn the setting off.`
    );
  });
});
