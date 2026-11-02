/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mustUseThoughtSignature } from './utils';

describe('mustUseThoughtSignature', () => {
  it('returns false when modelName is undefined', () => {
    expect(mustUseThoughtSignature(undefined)).toBe(false);
  });

  it('returns false for non-gemini-3 models', () => {
    expect(mustUseThoughtSignature('gemini-2.0-flash')).toBe(false);
    expect(mustUseThoughtSignature('gemini-1.5-pro')).toBe(false);
    expect(mustUseThoughtSignature('some-other-model')).toBe(false);
  });

  it('returns true for gemini-3-flash', () => {
    expect(mustUseThoughtSignature('gemini-3-flash')).toBe(true);
  });

  it('returns true for gemini-3-pro', () => {
    expect(mustUseThoughtSignature('gemini-3-pro')).toBe(true);
  });

  it('returns true for gemini-3.1-pro-preview', () => {
    expect(mustUseThoughtSignature('gemini-3.1-pro-preview')).toBe(true);
  });

  it('returns true for future gemini-3.x variants', () => {
    expect(mustUseThoughtSignature('gemini-3.2-flash')).toBe(true);
    expect(mustUseThoughtSignature('gemini-3.5-pro')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(mustUseThoughtSignature('Gemini-3-Flash')).toBe(true);
    expect(mustUseThoughtSignature('GEMINI-3.1-PRO-PREVIEW')).toBe(true);
  });
});
