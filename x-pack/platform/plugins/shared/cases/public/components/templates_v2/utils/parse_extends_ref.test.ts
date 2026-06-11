/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExtendsRef, formatExtendsRef } from './parse_extends_ref';

const TEMPLATE_ID = 'aabbccdd-1234-5678-90ab-cdef01234567';

describe('parseExtendsRef', () => {
  describe('bare templateId (no @version suffix)', () => {
    it('returns the id and no version for a plain string', () => {
      expect(parseExtendsRef(TEMPLATE_ID)).toEqual({
        templateId: TEMPLATE_ID,
        version: undefined,
      });
    });

    it('returns the id for a short/non-uuid id string', () => {
      expect(parseExtendsRef('my-template')).toEqual({
        templateId: 'my-template',
        version: undefined,
      });
    });
  });

  describe('version-pinned ref (<id>@<version>)', () => {
    it('parses a positive integer version', () => {
      expect(parseExtendsRef(`${TEMPLATE_ID}@3`)).toEqual({
        templateId: TEMPLATE_ID,
        version: 3,
      });
    });

    it('parses version 1', () => {
      expect(parseExtendsRef(`${TEMPLATE_ID}@1`)).toEqual({
        templateId: TEMPLATE_ID,
        version: 1,
      });
    });

    it('parses a large version number', () => {
      expect(parseExtendsRef(`${TEMPLATE_ID}@999`)).toEqual({
        templateId: TEMPLATE_ID,
        version: 999,
      });
    });
  });

  describe('malformed suffix — treated as bare id (no version)', () => {
    it('treats @0 as part of the id (0 is not a positive integer)', () => {
      const ref = `${TEMPLATE_ID}@0`;
      expect(parseExtendsRef(ref)).toEqual({ templateId: ref, version: undefined });
    });

    it('treats @-1 as part of the id (negative not allowed)', () => {
      const ref = `${TEMPLATE_ID}@-1`;
      expect(parseExtendsRef(ref)).toEqual({ templateId: ref, version: undefined });
    });

    it('treats @foo as part of the id (non-numeric)', () => {
      const ref = `${TEMPLATE_ID}@foo`;
      expect(parseExtendsRef(ref)).toEqual({ templateId: ref, version: undefined });
    });

    it('treats @1.5 as part of the id (non-integer)', () => {
      const ref = `${TEMPLATE_ID}@1.5`;
      expect(parseExtendsRef(ref)).toEqual({ templateId: ref, version: undefined });
    });

    it('treats an empty suffix (@) as part of the id', () => {
      const ref = `${TEMPLATE_ID}@`;
      expect(parseExtendsRef(ref)).toEqual({ templateId: ref, version: undefined });
    });

    it('treats a ref with an empty prefix (@3) as part of the id (no version parsed)', () => {
      // Avoids silently producing { templateId: "", version: 3 } which would cause
      // useGetTemplate to skip the fetch (empty string is falsy).
      const ref = '@3';
      expect(parseExtendsRef(ref)).toEqual({ templateId: ref, version: undefined });
    });
  });

  describe('edge cases', () => {
    it('returns undefined id and version for undefined input', () => {
      expect(parseExtendsRef(undefined)).toEqual({ templateId: undefined, version: undefined });
    });

    it('returns undefined id and version for empty string', () => {
      expect(parseExtendsRef('')).toEqual({ templateId: undefined, version: undefined });
    });

    it('uses the LAST @ when the id contains an @ (robustness)', () => {
      // Template IDs are v4 UUIDs (no @), but be explicit about split behaviour.
      const ref = 'some@weird@id@3';
      expect(parseExtendsRef(ref)).toEqual({ templateId: 'some@weird@id', version: 3 });
    });
  });
});

describe('formatExtendsRef', () => {
  it('returns a bare id when no version is provided', () => {
    expect(formatExtendsRef(TEMPLATE_ID)).toBe(TEMPLATE_ID);
  });

  it('returns a bare id when version is undefined', () => {
    expect(formatExtendsRef(TEMPLATE_ID, undefined)).toBe(TEMPLATE_ID);
  });

  it('returns a bare id when version is null', () => {
    expect(formatExtendsRef(TEMPLATE_ID, null)).toBe(TEMPLATE_ID);
  });

  it('appends @version when a positive integer version is supplied', () => {
    expect(formatExtendsRef(TEMPLATE_ID, 3)).toBe(`${TEMPLATE_ID}@3`);
  });

  it('appends @1 for version 1', () => {
    expect(formatExtendsRef(TEMPLATE_ID, 1)).toBe(`${TEMPLATE_ID}@1`);
  });

  describe('round-trip with parseExtendsRef', () => {
    it('round-trips a bare id', () => {
      const ref = formatExtendsRef(TEMPLATE_ID);
      expect(parseExtendsRef(ref)).toEqual({ templateId: TEMPLATE_ID, version: undefined });
    });

    it('round-trips an id with a version', () => {
      const ref = formatExtendsRef(TEMPLATE_ID, 5);
      expect(parseExtendsRef(ref)).toEqual({ templateId: TEMPLATE_ID, version: 5 });
    });
  });
});
