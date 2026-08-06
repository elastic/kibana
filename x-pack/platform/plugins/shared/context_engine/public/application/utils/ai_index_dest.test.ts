/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndexDest, validateAiIndexId } from './ai_index_dest';

describe('getAiIndexDest', () => {
  it('prefixes the id per storage type', () => {
    expect(getAiIndexDest('index', 'support-ticket-triage')).toEqual({
      type: 'index',
      value: 'ai-index-idx-support-ticket-triage',
    });
    expect(getAiIndexDest('data_stream', 'support-ticket-triage')).toEqual({
      type: 'data_stream',
      value: 'ai-index-ds-support-ticket-triage',
    });
  });
});

describe('validateAiIndexId', () => {
  it('returns the dest for a valid id', () => {
    expect(validateAiIndexId('index', 'support-ticket-triage')).toEqual({
      dest: { type: 'index', value: 'ai-index-idx-support-ticket-triage' },
    });
  });

  it('treats an empty id as incomplete: no dest and no error', () => {
    expect(validateAiIndexId('index', '')).toEqual({});
  });

  it('returns an error message when the id contains invalid characters', () => {
    const error =
      'Must start with a lowercase letter or number, then use lowercase letters, numbers, hyphens, and underscores.';
    expect(validateAiIndexId('index', 'Support triage')).toEqual({ error });
    expect(validateAiIndexId('index', 'bad id')).toEqual({ error });
    expect(validateAiIndexId('index', 'bad#id')).toEqual({ error });
  });

  it('returns an error message when the id does not start with a letter or number', () => {
    const error =
      'Must start with a lowercase letter or number, then use lowercase letters, numbers, hyphens, and underscores.';
    expect(validateAiIndexId('index', '-leading-hyphen')).toEqual({ error });
    expect(validateAiIndexId('index', '_leading_underscore')).toEqual({ error });
  });

  it('returns an error message when the dest exceeds the byte limit', () => {
    const { dest, error } = validateAiIndexId('index', 'a'.repeat(243));
    expect(dest).toBeUndefined();
    expect(error).toBe('Name is too long. Try a shorter name.');
  });
});
