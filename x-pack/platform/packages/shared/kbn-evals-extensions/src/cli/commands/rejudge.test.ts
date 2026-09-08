/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildJudgeAuthHeader } from './rejudge';

describe('buildJudgeAuthHeader', () => {
  it('base64-encodes raw user:pass credentials', () => {
    expect(buildJudgeAuthHeader({ basicAuth: 'elastic:changeme' })).toBe(
      `Basic ${Buffer.from('elastic:changeme').toString('base64')}`
    );
  });

  // Regression: a pre-encoded JUDGE_KBN_AUTH double-encodes, and the resulting
  // 401 only surfaces after every planned cell has been judged and discarded --
  // an entire AD rejudge (99 cells, two judges) was lost to it.
  it('rejects an already base64-encoded value instead of double-encoding', () => {
    const encoded = Buffer.from('elastic:changeme').toString('base64');
    expect(() => buildJudgeAuthHeader({ basicAuth: encoded })).toThrow(/raw "user:pass"/);
  });

  it('rejects a value that already carries the Basic scheme', () => {
    expect(() => buildJudgeAuthHeader({ basicAuth: 'Basic abc123' })).toThrow(/raw "user:pass"/);
  });

  it('falls back to the API key when no basic auth is given', () => {
    expect(buildJudgeAuthHeader({ apiKey: 'abc' })).toBe('ApiKey abc');
  });

  it('prefers basic auth over an API key, matching the stack that needs it', () => {
    expect(buildJudgeAuthHeader({ basicAuth: 'a:b', apiKey: 'abc' })).toBe(
      `Basic ${Buffer.from('a:b').toString('base64')}`
    );
  });

  it('returns undefined when neither credential is present', () => {
    expect(buildJudgeAuthHeader({})).toBeUndefined();
  });
});
