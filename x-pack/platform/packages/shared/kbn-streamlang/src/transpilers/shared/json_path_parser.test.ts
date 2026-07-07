/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseJsonPath,
  segmentsToStrings,
  validateJsonPath,
  JsonPathParseError,
  type JsonPathSegment,
} from './json_path_parser';

describe('parseJsonPath', () => {
  const key = (name: string): JsonPathSegment => ({ type: 'key', name });
  const index = (i: number): JsonPathSegment => ({ type: 'index', index: i });

  describe('dot notation', () => {
    it('parses a simple key', () => {
      const result = parseJsonPath('name');
      expect(result.segments).toEqual([key('name')]);
    });

    it('parses nested dot notation', () => {
      const result = parseJsonPath('user.address.city');
      expect(result.segments).toEqual([key('user'), key('address'), key('city')]);
    });

    it('parses two-level dot notation', () => {
      const result = parseJsonPath('a.b');
      expect(result.segments).toEqual([key('a'), key('b')]);
    });
  });

  describe('array index bracket notation', () => {
    it('parses array index', () => {
      const result = parseJsonPath('items[0]');
      expect(result.segments).toEqual([key('items'), index(0)]);
    });

    it('parses nested array index', () => {
      const result = parseJsonPath('orders[1].item');
      expect(result.segments).toEqual([key('orders'), index(1), key('item')]);
    });

    it('parses multiple array indices', () => {
      const result = parseJsonPath('a[0][1]');
      expect(result.segments).toEqual([key('a'), index(0), index(1)]);
    });

    it('parses array index in middle of path', () => {
      const result = parseJsonPath('a[0].b.c');
      expect(result.segments).toEqual([key('a'), index(0), key('b'), key('c')]);
    });

    it('allows whitespace inside brackets', () => {
      const result = parseJsonPath('items[ 0 ]');
      expect(result.segments).toEqual([key('items'), index(0)]);
    });
  });

  describe('$ prefix', () => {
    it('parses $. prefix', () => {
      const result = parseJsonPath('$.name');
      expect(result.segments).toEqual([key('name')]);
    });

    it('parses $. with nested path', () => {
      const result = parseJsonPath('$.user.address.city');
      expect(result.segments).toEqual([key('user'), key('address'), key('city')]);
    });

    it('parses $. with array index', () => {
      const result = parseJsonPath('$.tags[0]');
      expect(result.segments).toEqual([key('tags'), index(0)]);
    });

    it('parses $. with mixed nesting', () => {
      const result = parseJsonPath('$.orders[1].id');
      expect(result.segments).toEqual([key('orders'), index(1), key('id')]);
    });

    it('parses bare $ as root accessor', () => {
      const result = parseJsonPath('$');
      expect(result.segments).toEqual([]);
    });

    it('parses $. alone as root accessor', () => {
      const result = parseJsonPath('$.');
      expect(result.segments).toEqual([]);
    });

    it('parses empty string as root accessor', () => {
      const result = parseJsonPath('');
      expect(result.segments).toEqual([]);
    });

    it('parses $[ prefix with array index', () => {
      const result = parseJsonPath('$[1]');
      expect(result.segments).toEqual([index(1)]);
    });

    it('parses $[ prefix with quoted key', () => {
      const result = parseJsonPath("$['user.name']");
      expect(result.segments).toEqual([key('user.name')]);
    });

    it('parses $[ with nested path', () => {
      const result = parseJsonPath("$['a'].b");
      expect(result.segments).toEqual([key('a'), key('b')]);
    });
  });

  describe('bare leading bracket', () => {
    it('parses bare leading bracket with array index', () => {
      const result = parseJsonPath('[0]');
      expect(result.segments).toEqual([index(0)]);
    });

    it('parses bare leading bracket with quoted key', () => {
      const result = parseJsonPath("['name']");
      expect(result.segments).toEqual([key('name')]);
    });
  });

  describe('quoted bracket notation for named keys', () => {
    it('parses single-quoted key', () => {
      const result = parseJsonPath("['name']");
      expect(result.segments).toEqual([key('name')]);
    });

    it('parses double-quoted key', () => {
      const result = parseJsonPath('["name"]');
      expect(result.segments).toEqual([key('name')]);
    });

    it('parses quoted key with dot', () => {
      const result = parseJsonPath("['user.name']");
      expect(result.segments).toEqual([key('user.name')]);
    });

    it('parses quoted key with space', () => {
      const result = parseJsonPath("['first name']");
      expect(result.segments).toEqual([key('first name')]);
    });

    it('parses quoted key with brackets', () => {
      const result = parseJsonPath("['items[0]']");
      expect(result.segments).toEqual([key('items[0]')]);
    });

    it('parses empty quoted key (single quote)', () => {
      const result = parseJsonPath("['']");
      expect(result.segments).toEqual([key('')]);
    });

    it('parses empty quoted key (double quote)', () => {
      const result = parseJsonPath('[""]');
      expect(result.segments).toEqual([key('')]);
    });

    it('parses quoted key nested after dot notation', () => {
      const result = parseJsonPath("a['b.c']");
      expect(result.segments).toEqual([key('a'), key('b.c')]);
    });

    it('parses mixed dot and bracket notation', () => {
      const result = parseJsonPath("store['user.name']");
      expect(result.segments).toEqual([key('store'), key('user.name')]);
    });

    it('parses consecutive bracket notation', () => {
      const result = parseJsonPath("a['b.c']['d']");
      expect(result.segments).toEqual([key('a'), key('b.c'), key('d')]);
    });

    it('parses bracket notation after array index', () => {
      const result = parseJsonPath("arr[0]['a.b']");
      expect(result.segments).toEqual([key('arr'), index(0), key('a.b')]);
    });

    it('parses complex mixed path', () => {
      const result = parseJsonPath("$.store['items'][0].name");
      expect(result.segments).toEqual([key('store'), key('items'), index(0), key('name')]);
    });

    it('allows whitespace inside brackets with quoted keys', () => {
      const result = parseJsonPath("[ 'key' ]");
      expect(result.segments).toEqual([key('key')]);
    });
  });

  describe('escape sequences', () => {
    it('parses escaped single quote in single-quoted key', () => {
      const result = parseJsonPath("['it\\'s']");
      expect(result.segments).toEqual([key("it's")]);
    });

    it('parses escaped double quote in double-quoted key', () => {
      const result = parseJsonPath('["say \\"hi\\""]');
      expect(result.segments).toEqual([key('say "hi"')]);
    });

    it('parses escaped backslash', () => {
      const result = parseJsonPath("['a\\\\b']");
      expect(result.segments).toEqual([key('a\\b')]);
    });

    it('passes through unrecognized escape sequences', () => {
      const result = parseJsonPath("['a\\nb']");
      expect(result.segments).toEqual([key('anb')]);
    });
  });

  describe('dot / bracket equivalence (RFC 9535)', () => {
    it('dot and single-quoted bracket are equivalent', () => {
      expect(parseJsonPath('a.b').segments).toEqual(parseJsonPath("a['b']").segments);
    });

    it('dot and double-quoted bracket are equivalent', () => {
      expect(parseJsonPath('a.b').segments).toEqual(parseJsonPath('a["b"]').segments);
    });

    it('nested dot and bracket are equivalent', () => {
      expect(parseJsonPath('a.b.c').segments).toEqual(parseJsonPath("a['b']['c']").segments);
    });
  });

  describe('error cases', () => {
    it('rejects consecutive dots', () => {
      expect(() => parseJsonPath('a..b')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a..b')).toThrow('consecutive dots');
    });

    it('rejects trailing dot', () => {
      expect(() => parseJsonPath('a.')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a.')).toThrow('path cannot end with a dot');
    });

    it('rejects leading dot', () => {
      expect(() => parseJsonPath('.a')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('.a')).toThrow('path cannot start with a dot');
    });

    it('rejects empty brackets', () => {
      expect(() => parseJsonPath('a[]')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a[]')).toThrow('empty brackets');
    });

    it('rejects unterminated quoted key', () => {
      expect(() => parseJsonPath("a['unclosed")).toThrow(JsonPathParseError);
      expect(() => parseJsonPath("a['unclosed")).toThrow('unterminated quoted key');
    });

    it('rejects missing closing bracket', () => {
      expect(() => parseJsonPath('a[0')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a[0')).toThrow('missing closing bracket');
    });

    it('rejects invalid $ prefix', () => {
      expect(() => parseJsonPath('$name')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('$name')).toThrow('expected [.] or [[] after [$]');
    });

    it('rejects non-numeric array index', () => {
      expect(() => parseJsonPath('a[abc]')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a[abc]')).toThrow('expected integer array index');
    });

    it('rejects leading zeros in array index', () => {
      expect(() => parseJsonPath('a[01]')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a[01]')).toThrow('leading zeros are not allowed');
    });

    it('rejects multiple consecutive dots like $.....dsfsd', () => {
      expect(() => parseJsonPath('$.....dsfsd')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('$.....dsfsd')).toThrow('path cannot start with a dot');
    });

    it('rejects consecutive dots in middle of path', () => {
      expect(() => parseJsonPath('a...b')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a...b')).toThrow('consecutive dots');
    });

    it('rejects unsupported JSONPath features - wildcards', () => {
      expect(() => parseJsonPath('a[*]')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a[*]')).toThrow('expected integer array index');
      expect(() => parseJsonPath('a.*')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a.*')).toThrow('unsupported character');
    });

    it('rejects unsupported JSONPath features - array slicing', () => {
      expect(() => parseJsonPath('a[0:3]')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a[0:3]')).toThrow('expected integer array index');
    });

    it('rejects unsupported JSONPath features - filter expressions', () => {
      expect(() => parseJsonPath('a[?(@.price<10)]')).toThrow(JsonPathParseError);
    });

    it('rejects unterminated bracket', () => {
      expect(() => parseJsonPath('a[')).toThrow(JsonPathParseError);
      expect(() => parseJsonPath('a[')).toThrow('unterminated bracket');
    });
  });

  describe('error position offset', () => {
    it('shifts position in error message', () => {
      try {
        parseJsonPath('a..b', 10);
        fail('Expected error');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonPathParseError);
        expect((e as JsonPathParseError).message).toContain('position 11');
      }
    });

    it('accounts for $ prefix when calculating position', () => {
      try {
        parseJsonPath('$.a..b', 10);
        fail('Expected error');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonPathParseError);
        expect((e as JsonPathParseError).message).toContain('position 13');
      }
    });
  });
});

describe('segmentsToStrings', () => {
  it('converts keys and indices to strings', () => {
    const segments = parseJsonPath('user[0].name').segments;
    expect(segmentsToStrings(segments)).toEqual(['user', '0', 'name']);
  });

  it('returns empty array for root path', () => {
    const segments = parseJsonPath('$').segments;
    expect(segmentsToStrings(segments)).toEqual([]);
  });
});

describe('validateJsonPath', () => {
  it('does not throw for valid paths', () => {
    expect(() => validateJsonPath('user.name')).not.toThrow();
    expect(() => validateJsonPath("$['key']")).not.toThrow();
    expect(() => validateJsonPath('items[0].value')).not.toThrow();
  });

  it('throws for invalid paths', () => {
    expect(() => validateJsonPath('a..b')).toThrow(JsonPathParseError);
  });
});
