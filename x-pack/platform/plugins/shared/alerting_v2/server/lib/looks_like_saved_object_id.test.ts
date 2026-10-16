/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { looksLikeSavedObjectId } from './looks_like_saved_object_id';

describe('looksLikeSavedObjectId', () => {
  it('accepts a UUID regardless of case', () => {
    expect(looksLikeSavedObjectId('0b4e1a7c-3f1a-4a52-9a2c-5a3e6d3b8f10')).toBe(true);
    expect(looksLikeSavedObjectId('0B4E1A7C-3F1A-4A52-9A2C-5A3E6D3B8F10')).toBe(true);
  });

  it('rejects ordinary words and partial ids', () => {
    expect(looksLikeSavedObjectId('cpu')).toBe(false);
    expect(looksLikeSavedObjectId('0b4e1a7c-3f1a')).toBe(false);
    expect(looksLikeSavedObjectId('')).toBe(false);
  });
});
