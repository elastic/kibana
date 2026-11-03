/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('decisionModel.openRouter config', () => {
  it('defaults to the OpenRouter API base that serves /alpha/decisions', () => {
    const { decisionModel } = configSchema.validate({
      decisionModel: { openRouter: { apiKey: 'test-key' } },
    });

    expect(decisionModel.openRouter).toEqual({
      apiKey: 'test-key',
      model: 'typesafe/jev-1.13',
      url: 'https://openrouter.ai/api',
    });
  });

  it('gives the fast model a 2s budget and the decision models 1s', () => {
    const { decisionModel } = configSchema.validate({});

    expect(decisionModel.timeoutMs).toBe(1000);
    expect(decisionModel.fastModelTimeoutMs).toBe(2000);
  });
});
