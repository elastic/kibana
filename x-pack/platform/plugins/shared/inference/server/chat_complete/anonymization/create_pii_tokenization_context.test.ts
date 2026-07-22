/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PiiDetectionContext } from './pii_detection_context';
import { createPiiTokenizationContext } from './create_pii_tokenization_context';

const detectionContext: PiiDetectionContext = {
  detectEntities: jest.fn().mockResolvedValue([]),
};

describe('createPiiTokenizationContext', () => {
  it('derives stable tokens for the same session without exposing scope or key material', () => {
    const first = createPiiTokenizationContext({
      detectionContext,
      serverSalt: 'stable-high-entropy-test-secret',
      sessionId: 'conversation-1',
    });
    const second = createPiiTokenizationContext({
      detectionContext,
      serverSalt: 'stable-high-entropy-test-secret',
      sessionId: 'conversation-1',
    });

    expect(first.tokenize('EMAIL', 'person@example.com')).toBe(
      second.tokenize('EMAIL', 'person@example.com')
    );
    expect(Object.keys(first).sort()).toEqual(['detectEntities', 'tokenize']);
    expect(JSON.stringify(first)).not.toContain('stable-high-entropy-test-secret');
    expect(JSON.stringify(first)).not.toContain('conversation-1');
  });

  it('isolates deterministic tokens by session', () => {
    const first = createPiiTokenizationContext({
      detectionContext,
      serverSalt: 'stable-high-entropy-test-secret',
      sessionId: 'conversation-1',
    });
    const second = createPiiTokenizationContext({
      detectionContext,
      serverSalt: 'stable-high-entropy-test-secret',
      sessionId: 'conversation-2',
    });

    expect(first.tokenize('EMAIL', 'person@example.com')).not.toBe(
      second.tokenize('EMAIL', 'person@example.com')
    );
  });

  it('uses an independent random scope for each call without a session', () => {
    const first = createPiiTokenizationContext({
      detectionContext,
      serverSalt: 'stable-high-entropy-test-secret',
    });
    const second = createPiiTokenizationContext({
      detectionContext,
      serverSalt: 'stable-high-entropy-test-secret',
    });

    expect(first.tokenize('EMAIL', 'person@example.com')).not.toBe(
      second.tokenize('EMAIL', 'person@example.com')
    );
  });

  it('delegates detection without exposing the detector implementation', async () => {
    const detectEntities = jest.fn().mockResolvedValue([]);
    const context = createPiiTokenizationContext({
      detectionContext: { detectEntities },
      serverSalt: 'stable-high-entropy-test-secret',
      sessionId: 'conversation-1',
    });
    const options = { records: [{ id: 'record', text: 'hello' }], rules: [] };

    await context.detectEntities(options);

    expect(detectEntities).toHaveBeenCalledWith(options);
  });
});
