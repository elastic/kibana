/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceIdFilter } from './build_space_id_filter';

describe('buildSpaceIdFilter', () => {
  it('always returns a filter clause', () => {
    expect(buildSpaceIdFilter('default')).toBeDefined();
    expect(buildSpaceIdFilter('my-space')).toBeDefined();
  });

  it('matches the default space OR a missing space_id field in the default space', () => {
    expect(buildSpaceIdFilter('default')).toEqual({
      bool: {
        should: [
          { term: { space_id: 'default' } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
        ],
      },
    });
  });

  it('matches the space exactly in a named space (no missing-field fallback)', () => {
    expect(buildSpaceIdFilter('my-space')).toEqual({ term: { space_id: 'my-space' } });
  });

  it('drops the missing-field clause in the default space when matchMissingSpaceId is false', () => {
    expect(buildSpaceIdFilter('default', { matchMissingSpaceId: false })).toEqual({
      term: { space_id: 'default' },
    });
  });

  it('is unaffected by matchMissingSpaceId in a named space', () => {
    expect(buildSpaceIdFilter('my-space', { matchMissingSpaceId: false })).toEqual({
      term: { space_id: 'my-space' },
    });
  });

  describe('matchActionDataSpaceId', () => {
    it('defaults to off, leaving every existing caller byte-identical', () => {
      expect(buildSpaceIdFilter('my-space', {})).toEqual({ term: { space_id: 'my-space' } });
      expect(buildSpaceIdFilter('default', {})).toEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { bool: { must_not: { exists: { field: 'space_id' } } } },
          ],
        },
      });
    });

    it('also matches action_data.space_id in a named space when enabled', () => {
      expect(buildSpaceIdFilter('my-space', { matchActionDataSpaceId: true })).toEqual({
        bool: {
          should: [
            { term: { space_id: 'my-space' } },
            { term: { 'action_data.space_id': 'my-space' } },
          ],
        },
      });
    });

    it('matches the top-level field, the missing field, and action_data in the default space', () => {
      expect(buildSpaceIdFilter('default', { matchActionDataSpaceId: true })).toEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { bool: { must_not: { exists: { field: 'space_id' } } } },
            { term: { 'action_data.space_id': 'default' } },
          ],
        },
      });
    });

    // The two flags are orthogonal: action_data.space_id is a present, exact-valued
    // term, so it stays safe under CPS fan-out where a missing field does not.
    it('still matches action_data.space_id when matchMissingSpaceId is false', () => {
      const filter = buildSpaceIdFilter('default', {
        matchMissingSpaceId: false,
        matchActionDataSpaceId: true,
      });

      expect(filter).toEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { term: { 'action_data.space_id': 'default' } },
          ],
        },
      });
      expect(JSON.stringify(filter)).not.toContain('must_not');
    });

    it('never matches field-less documents in a named space', () => {
      const filter = buildSpaceIdFilter('my-space', {
        matchMissingSpaceId: true,
        matchActionDataSpaceId: true,
      });

      expect(JSON.stringify(filter)).not.toContain('must_not');
    });
  });
});
