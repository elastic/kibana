/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_MENTIONS_PER_COMMENT } from '../constants';
import { parseMentions, toMentionToken } from './mentions';

describe('mentions', () => {
  describe('parseMentions', () => {
    it('returns the unique uids of the mention tokens', () => {
      expect(
        parseMentions('Hi @[Jane Doe](u_jane-1) and @[John](u_john), cc @[Jane Doe](u_jane-1)')
      ).toEqual(['u_jane-1', 'u_john']);
    });

    it('ignores plain @ text and malformed tokens', () => {
      expect(parseMentions('mail me@example.com or @jane or @[Jane]() or @[](u_1)')).toEqual([]);
    });

    it(`caps the result at ${MAX_MENTIONS_PER_COMMENT} uids`, () => {
      const content = Array.from({ length: MAX_MENTIONS_PER_COMMENT + 5 }, (_, index) =>
        toMentionToken({ name: `User ${index}`, uid: `uid_${index}` })
      ).join(' ');

      expect(parseMentions(content)).toHaveLength(MAX_MENTIONS_PER_COMMENT);
    });
  });

  describe('toMentionToken', () => {
    it('builds a token that parses back to the uid', () => {
      const token = toMentionToken({ name: 'Jane Doe', uid: 'u_jane' });

      expect(token).toBe('@[Jane Doe](u_jane)');
      expect(parseMentions(token)).toEqual(['u_jane']);
    });

    it('strips characters that would break the token', () => {
      expect(toMentionToken({ name: 'Jane]\nDoe', uid: 'u_jane' })).toBe('@[Jane  Doe](u_jane)');
    });
  });
});
