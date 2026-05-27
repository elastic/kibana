/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { restoreTokens } from './executor';

const TOKEN_IP = 'IP_aabbccddeeff00112233445566778899';
const TOKEN_EMAIL = 'EMAIL_00112233445566778899aabbccddeeff';

describe('restoreTokens', () => {
  const tokenMap = {
    [TOKEN_IP]: { original: '192.168.1.50', entityClass: 'IP' },
    [TOKEN_EMAIL]: { original: 'admin@example.com', entityClass: 'EMAIL' },
  };

  it('replaces a token with its original value', () => {
    const text = `Alert from ${TOKEN_IP}.`;
    const result = restoreTokens(text, tokenMap);
    expect(result).toBe('Alert from 192.168.1.50.');
  });

  it('replaces multiple tokens in the same text', () => {
    const text = `${TOKEN_IP} sent email to ${TOKEN_EMAIL}.`;
    const result = restoreTokens(text, tokenMap);
    expect(result).toBe('192.168.1.50 sent email to admin@example.com.');
  });

  it('leaves unknown tokens unchanged', () => {
    const text = 'Unknown UNKNOWN_00000000000000000000000000000000 token.';
    const result = restoreTokens(text, tokenMap);
    expect(result).toContain('UNKNOWN_00000000000000000000000000000000');
  });

  it('returns the original text unchanged when the tokenMap is empty', () => {
    const text = 'No tokens here.';
    expect(restoreTokens(text, {})).toBe(text);
  });

  it('handles text with no tokens gracefully', () => {
    expect(restoreTokens('plain text', tokenMap)).toBe('plain text');
  });
});
