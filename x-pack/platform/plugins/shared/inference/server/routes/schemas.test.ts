/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import { chatCompleteBodySchema } from './schemas';

const body = {
  connectorId: 'connector',
  messages: [{ role: MessageRole.User, content: 'question' }],
};

describe('chatCompleteBodySchema maxTokens', () => {
  it('accepts a missing value and a positive integer', () => {
    expect(chatCompleteBodySchema.validate(body).maxTokens).toBeUndefined();
    expect(chatCompleteBodySchema.validate({ ...body, maxTokens: 16000 }).maxTokens).toBe(16000);
  });

  it('rejects zero, fractions, and values above the cap', () => {
    expect(() => chatCompleteBodySchema.validate({ ...body, maxTokens: 0 })).toThrow();
    expect(() => chatCompleteBodySchema.validate({ ...body, maxTokens: 1.5 })).toThrow();
    expect(() => chatCompleteBodySchema.validate({ ...body, maxTokens: 10_000_001 })).toThrow();
  });
});
