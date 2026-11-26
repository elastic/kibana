/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conversationIdFromUri, conversationUri, kiIdFromUri, kiUri } from './ki_uri';

describe('ki uris', () => {
  it('round-trips KI URIs', () => {
    expect(kiIdFromUri(kiUri('mem-1'))).toBe('mem-1');
    expect(kiIdFromUri('index://logs')).toBeUndefined();
    expect(kiIdFromUri('ki://')).toBeUndefined();
  });

  it('round-trips conversation URIs', () => {
    expect(conversationUri('conv-1')).toBe('conversation://conv-1');
    expect(conversationIdFromUri(conversationUri('conv-1'))).toBe('conv-1');
    expect(conversationIdFromUri('ki://conv-1')).toBeUndefined();
    expect(conversationIdFromUri('conversation://')).toBeUndefined();
  });
});
