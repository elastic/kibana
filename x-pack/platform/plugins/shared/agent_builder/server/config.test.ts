/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('decisionModel config', () => {
  it('gives the fast model a 2s budget and the decision models 1s', () => {
    const { decisionModel } = configSchema.validate({});

    expect(decisionModel.eisTimeoutMs).toBe(1000);
    expect(decisionModel.fastModelTimeoutMs).toBe(2000);
  });

  it('skips an unavailable provider for an hour', () => {
    const { decisionModel } = configSchema.validate({});

    expect(decisionModel.unavailableTtlMs).toBe(60 * 60 * 1000);
  });
});
