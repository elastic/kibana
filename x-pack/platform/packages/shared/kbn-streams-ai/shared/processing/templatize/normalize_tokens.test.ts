/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PATTERN_PRECEDENCE } from './pattern_precedence';
import { NormalizedToken, normalizeTokensForColumn } from './normalize_tokens';
import {} from './get_pattern_regex_map';
import { findMatchingPatterns } from './find_matching_patterns';
import { uniq } from 'lodash';

const formatTokens = (tokens: NormalizedToken[]) => {
  const formatted = tokens
    .concat()
    .map((token) => [PATTERN_PRECEDENCE[token.patterns[0]], uniq(token.values)]);
  return formatted;
};

describe('normalizeTokensForColumn', () => {
  // Indexes for commonly used patterns
  const DATA_IDX = PATTERN_PRECEDENCE.indexOf('DATA');
  const NOTSPACE_IDX = PATTERN_PRECEDENCE.indexOf('NOTSPACE');

  // Helper function to create token with patterns
  const createToken = (value: string) => {
    // Determine appropriate patterns based on value content
    const patterns = findMatchingPatterns(value);

    return {
      value,
      patterns,
    };
  };

  const createTokenList = (values: string[]) => {
    return values.map((value) => createToken(value));
  };

  describe('Longest Common Prefix (LCP) detection', () => {
    it('identifies common prefix tokens with exact matches', () => {
      const tokenLists = [
        createTokenList(['[', 'foo', '@', 'example.com', ']']),
        createTokenList(['[', 'bar', '@', 'example.com', ']']),
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(formatTokens(result.tokens)).toEqual([
        ['[', ['[']],
        ['WORD', ['foo', 'bar']],
        ['@', ['@']],
        ['NOTSPACE', ['example.com']],
        [']', [']']],
      ]);
    });

    it('identifies common prefix patterns when values differ', () => {
      const tokenLists = [
        [
          createToken('['),
          createToken('192.168.1.1'),
          createToken(':'),
          createToken('80'),
          createToken(']'),
        ],
        [
          createToken('['),
          createToken('10.0.0.1'),
          createToken(':'),
          createToken('443'),
          createToken(']'),
        ],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(formatTokens(result.tokens)).toEqual([
        ['[', ['[']],
        ['IPV4', ['192.168.1.1', '10.0.0.1']],
        [':', [':']],
        ['INT', ['80', '443']],
        [']', [']']],
      ]);
    });
  });

  describe('Longest Common Suffix (LCS) detection', () => {
    it('identifies common suffix tokens with exact matches', () => {
      const tokenLists = [
        [
          createToken('['),
          createToken('foo'),
          createToken('@'),
          createToken('example.com'),
          createToken(']'),
        ],
        [
          createToken('['),
          createToken('bar'),
          createToken('@'),
          createToken('example.com'),
          createToken(']'),
        ],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      // Last token should be ]
      expect(result.tokens[result.tokens.length - 1].values).toEqual([']', ']']);

      // Second to last token should be example.com
      expect(result.tokens[result.tokens.length - 2].values).toEqual([
        'example.com',
        'example.com',
      ]);

      // Third to last token should be @
      expect(result.tokens[result.tokens.length - 3].values).toEqual(['@', '@']);
    });

    it('identifies common suffix patterns when values differ with different token lengths', () => {
      const tokenLists = [
        [
          createToken('User'),
          createToken(' '),
          createToken('named'),
          createToken(' '),
          createToken('John'),
          createToken(' '),
          createToken('Doe'),
          createToken(' '),
          createToken('from'),
          createToken(' '),
          createToken('192.168.1.1'),
        ],
        [
          createToken('Name'),
          createToken(' '),
          createToken('Alice'),
          createToken(' '),
          createToken('from'),
          createToken(' '),
          createToken('10.0.0.1'),
        ],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(formatTokens(result.tokens)).toEqual([
        ['WORD', ['User', 'Name']],
        [' ', [' ']],
        ['WORD', ['named', 'Alice']],
        ['DATA', [' John Doe ', ' ']],
        ['WORD', ['from']],
        [' ', [' ']],
        ['IPV4', ['192.168.1.1', '10.0.0.1']],
      ]);
    });
  });

  describe('Middle segment processing', () => {
    it('processes middle segments token by token when they have the same length', () => {
      const tokenLists = [
        [
          createToken('['),
          createToken('foo'),
          createToken('bar'),
          createToken('baz'),
          createToken(']'),
        ],
        [
          createToken('['),
          createToken('abc'),
          createToken('def'),
          createToken('ghi'),
          createToken(']'),
        ],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      // Should have 5 tokens: [, middle1, middle2, middle3, ]
      expect(result.tokens.length).toBe(5);

      // Middle tokens should be generalized but kept separate
      expect(result.tokens[1].values).toEqual(['foo', 'abc']);
      expect(result.tokens[2].values).toEqual(['bar', 'def']);
      expect(result.tokens[3].values).toEqual(['baz', 'ghi']);
    });

    it('collapses variable length middle segments into a single NOTSPACE token', () => {
      const tokenLists = [
        createTokenList(['[', 'foo', '.', 'bar', '.', 'baz', ']']),
        createTokenList(['[', 'abc', ']']),
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(formatTokens(result.tokens)).toEqual([
        ['[', ['[']],
        ['NOTSPACE', ['foo.bar.baz', 'abc']],
        [']', [']']],
      ]);
    });

    it('uses NOTSPACE for middle segments with no spaces', () => {
      const tokenLists = [
        [createToken('['), createToken('foo.bar.baz'), createToken(']')],
        [createToken('['), createToken('abc.def'), createToken(']')],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      // Middle token should use NOTSPACE pattern
      expect(result.tokens[1].values).toEqual(['foo.bar.baz', 'abc.def']);
      expect(result.tokens[1].patterns[0]).toEqual(NOTSPACE_IDX);
    });

    it('uses DATA for middle segments with spaces', () => {
      const tokenLists = [
        [createToken('['), createToken('foo bar baz'), createToken(']')],
        [createToken('['), createToken('abc def'), createToken(']')],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      // Middle token should use DATA pattern
      expect(result.tokens[1].values).toEqual(['foo bar baz', 'abc def']);
      expect(result.tokens[1].patterns).toContain(DATA_IDX);
      expect(result.tokens[1].patterns).not.toContain(NOTSPACE_IDX);
    });
  });

  describe('Complex examples', () => {
    it('handles the email example correctly', () => {
      const tokenLists = [
        [
          createToken('['),
          createToken('foo.bar.baz'),
          createToken('@'),
          createToken('mydomain.com'),
          createToken(']'),
        ],
        [
          createToken('['),
          createToken('foo.baz'),
          createToken('@'),
          createToken('mydomain.com'),
          createToken(']'),
        ],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      // Should properly identify the structure [%{NOTSPACE}@%{DATA}]
      expect(result.tokens.length).toBe(5);
      expect(result.tokens[0].values).toEqual(['[', '[']);
      expect(result.tokens[1].values).toEqual(['foo.bar.baz', 'foo.baz']);
      expect(result.tokens[1].patterns).toContain(NOTSPACE_IDX);
      expect(result.tokens[2].values).toEqual(['@', '@']);
      expect(result.tokens[3].values).toEqual(['mydomain.com', 'mydomain.com']);
      expect(result.tokens[4].values).toEqual([']', ']']);
    });
  });

  describe('Scoring', () => {
    it('should score overlapping patterns correctly', () => {
      const tokenListWithPath = createTokenList([
        ...'/apps/x86_64/system/ganglia-3.0.1/sbin/gmetad'.split('/'),
        '[',
        '1682',
        ']',
        ':',
      ]);

      const tokenLists = [
        tokenListWithPath,
        tokenListWithPath,
        tokenListWithPath,
        createTokenList(['crond', '(', 'pam_unix', ')', '[', '23469', ']', ':']),
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(
        result.tokens
          .concat()
          .reverse()
          .slice(0, 4)
          .map((token) => [PATTERN_PRECEDENCE[token.patterns[0]], uniq(token.values)])
      ).toEqual([
        [':', [':']],
        [']', [']']],
        ['INT', ['1682', '23469']],
        ['[', ['[']],
      ]);
    });

    it('merges prefix and suffixes', () => {
      const tokenLists = [
        createTokenList([
          '[',
          'RecvWorker:188978561024:QuorumCnxManager$RecvWorker',
          '@',
          '765',
          ']',
        ]),
        createTokenList([
          '[',
          '/',
          '10.10.34.11',
          ':3888:QuorumCnxManager$Listener',
          '@',
          '493',
          ']',
        ]),
        createTokenList([
          '[',
          'NIOServerCxn.Factory:',
          '0.0.0.0',
          '/',
          '0.0.0.0',
          ':2181:NIOServerCnxn',
          '@',
          '1001',
          ']',
        ]),
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(formatTokens(result.tokens)).toEqual([
        ['[', ['[']],
        [
          'NOTSPACE',
          [
            'RecvWorker:188978561024:QuorumCnxManager$RecvWorker',
            '/10.10.34.11:3888:QuorumCnxManager$Listener',
            'NIOServerCxn.Factory:0.0.0.0/0.0.0.0:2181:NIOServerCnxn',
          ],
        ],
        ['@', ['@']],
        ['INT', ['765', '493', '1001']],
        [']', [']']],
      ]);
    });

    it('merges inwards correctly', () => {
      const tokenLists = [
        [
          {
            value: '[',
            patterns: [50, 57, 58, 59],
          },
          {
            value: '/',
            patterns: [42, 57, 58, 59],
          },
          {
            value: '10.10.34.11',
            patterns: [8, 9, 57, 58, 59],
          },
          {
            value: ':3888:QuorumCnxManager$Listener',
            patterns: [57, 58, 59],
          },
          {
            value: '@',
            patterns: [41, 57, 58, 59],
          },
          {
            value: '493',
            patterns: [33, 55, 57, 58, 59],
          },
          {
            value: ']',
            patterns: [51, 57, 58, 59],
          },
        ],
        [
          {
            value: '[',
            patterns: [50, 57, 58, 59],
          },
          {
            value: 'NIOServerCxn.Factory:',
            patterns: [57, 58, 59],
          },
          {
            value: '0.0.0.0',
            patterns: [8, 9, 57, 58, 59],
          },
          {
            value: '/',
            patterns: [42, 57, 58, 59],
          },
          {
            value: '0.0.0.0',
            patterns: [8, 9, 57, 58, 59],
          },
          {
            value: ':2181:NIOServerCnxn',
            patterns: [57, 58, 59],
          },
          {
            value: '@',
            patterns: [41, 57, 58, 59],
          },
          {
            value: '1001',
            patterns: [33, 55, 57, 58, 59],
          },
          {
            value: ']',
            patterns: [51, 57, 58, 59],
          },
        ],
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      const beginning = result.tokens.slice(0, 1);
      const end = result.tokens.slice(-3);

      expect(formatTokens(beginning)).toEqual([['[', ['[']]]);

      expect(formatTokens(end)).toEqual([
        ['@', ['@']],
        ['INT', ['493', '1001']],
        [']', [']']],
      ]);
    });

    it('does not inject optional values', () => {
      const tokenLists = [
        createTokenList(['started']),
        createTokenList(['stopped']),
        createTokenList(['error', ':']),
      ];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(formatTokens(result.tokens)).toEqual([['NOTSPACE', ['started', 'stopped', 'error:']]]);
    });
  });

  describe('Edge cases', () => {
    it('handles empty token lists', () => {
      const tokenLists: any[][] = [[], []];
      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      expect(result.tokens).toEqual([]);
    });

    it('handles single token lists', () => {
      const tokenLists = [[createToken('foo')], [createToken('bar')]];

      const result = normalizeTokensForColumn(tokenLists, 0, 0);

      // Should generalize to a single token with DATA pattern
      expect(result.tokens.length).toBe(1);
      expect(result.tokens[0].values).toEqual(['foo', 'bar']);
    });

    it('handles whitespace information correctly', () => {
      const result = normalizeTokensForColumn([], 3, 2);

      expect(result.whitespace.leading).toBe(3);
      expect(result.whitespace.trailing).toBe(2);
    });
  });
});
