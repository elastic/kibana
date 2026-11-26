/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conversationIdFromUri, conversationUri, kiIdFromUri, kiUri, parseKiUri } from './ki_uri';

describe('ki uris', () => {
  it('round-trips KI URIs', () => {
    expect(kiUri('mem-1')).toBe('ki://mem-1');
    expect(kiIdFromUri(kiUri('mem-1'))).toBe('mem-1');
    expect(kiIdFromUri('ki://mem%2F1')).toBe('mem%2F1');
    expect(kiIdFromUri('index://logs')).toBeUndefined();
    expect(kiIdFromUri('conversation://conv-1')).toBeUndefined();
  });

  it('returns undefined when the KI id is missing', () => {
    expect(kiIdFromUri('ki://')).toBeUndefined();
    expect(kiIdFromUri('ki:')).toBeUndefined();
  });

  it('round-trips conversation URIs', () => {
    expect(conversationUri('conv-1')).toBe('conversation://conv-1');
    expect(conversationIdFromUri(conversationUri('conv-1'))).toBe('conv-1');
    expect(conversationIdFromUri('ki://conv-1')).toBeUndefined();
    expect(conversationIdFromUri('conversation://')).toBeUndefined();
  });

  it('preserves conversation ids that contain reserved URI characters', () => {
    const conversationId = 'conv/with spaces?query=1';
    expect(conversationUri(conversationId)).toBe(`conversation://${conversationId}`);
    expect(conversationIdFromUri(conversationUri(conversationId))).toBe(conversationId);
  });
});

describe('parseKiUri', () => {
  it('parses scheme and identifier', () => {
    expect(parseKiUri('workflow://quick-test-metadata-2')).toEqual({
      scheme: 'workflow',
      identifier: 'quick-test-metadata-2',
    });
    expect(parseKiUri('tool://platform.context_engine.remember')).toEqual({
      scheme: 'tool',
      identifier: 'platform.context_engine.remember',
    });
  });

  it('returns undefined for non-uri values', () => {
    expect(parseKiUri('not-a-uri')).toBeUndefined();
    expect(parseKiUri('workflow://')).toBeUndefined();
  });
});
