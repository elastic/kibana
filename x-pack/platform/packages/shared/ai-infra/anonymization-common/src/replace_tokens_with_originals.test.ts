/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceTokensWithOriginals } from './replace_tokens_with_originals';

describe('replaceTokensWithOriginals', () => {
  it('returns the original text when the mapping is empty', () => {
    const result = replaceTokensWithOriginals('some text', {});

    expect(result).toBe('some text');
  });

  it('returns the original text when no tokens are present', () => {
    const result = replaceTokensWithOriginals('no tokens here', {
      HOST_NAME_abc123: 'my-server',
    });

    expect(result).toBe('no tokens here');
  });

  it('replaces a single token with its original value', () => {
    const result = replaceTokensWithOriginals('The host is HOST_NAME_abc123', {
      HOST_NAME_abc123: 'my-server',
    });

    expect(result).toBe('The host is my-server');
  });

  it('replaces multiple different tokens', () => {
    const result = replaceTokensWithOriginals(
      'HOST_NAME_abc123 was accessed by USER_NAME_def456',
      {
        HOST_NAME_abc123: 'my-server',
        USER_NAME_def456: 'alice',
      }
    );

    expect(result).toBe('my-server was accessed by alice');
  });

  it('replaces all occurrences of the same token', () => {
    const result = replaceTokensWithOriginals(
      'HOST_NAME_abc123 connects to HOST_NAME_abc123',
      {
        HOST_NAME_abc123: 'my-server',
      }
    );

    expect(result).toBe('my-server connects to my-server');
  });

  it('replaces longer tokens first to avoid partial matches', () => {
    const result = replaceTokensWithOriginals(
      'HOST_NAME_abc HOST_NAME_abc123',
      {
        HOST_NAME_abc: 'short-host',
        HOST_NAME_abc123: 'long-host',
      }
    );

    expect(result).toBe('short-host long-host');
  });
});
