/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeIngestToken, parseIngestToken } from './parse_ingest_token';

describe('composeIngestToken / parseIngestToken', () => {
  it('round-trips credential id and secret', () => {
    const token = composeIngestToken('cred-1', 'super-secret');
    expect(token).toBe('cred-1.super-secret');
    expect(parseIngestToken(token)).toEqual({ credentialId: 'cred-1', secret: 'super-secret' });
  });

  it('returns undefined for preview tokens without a credential id', () => {
    expect(parseIngestToken('opaque-preview-token')).toBeUndefined();
    expect(parseIngestToken('')).toBeUndefined();
    expect(parseIngestToken('.secret')).toBeUndefined();
    expect(parseIngestToken('cred-1.')).toBeUndefined();
  });
});
