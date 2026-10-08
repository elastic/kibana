/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceIdFilter } from './build_space_id_filter';

interface ExistsClause {
  exists: { field: string };
}

// `estypes.QueryDslQueryContainer` resolves to a union that includes `undefined`, so
// the emitted shape is asserted through a local type, as enforce_space_scope.ts does.
interface SpaceIdFilterShape {
  bool?: {
    should?: Array<{
      term?: Record<string, string>;
      bool?: {
        filter?: { term: Record<string, string> };
        must_not?: ExistsClause | ExistsClause[];
      };
    }>;
  };
}

// The `action_data.space_id` fallback only speaks for documents Kibana never
// stamped, so the trusted top-level field keeps precedence.
const actionDataFallback = (spaceId: string) => ({
  bool: {
    filter: { term: { 'action_data.space_id': spaceId } },
    must_not: { exists: { field: 'space_id' } },
  },
});

// The allowance that admits unstamped documents outright, as opposed to the
// fallback above, whose `must_not` is paired with a required `action_data` term.
const hasMissingFieldAllowance = (filter: SpaceIdFilterShape): boolean =>
  (filter.bool?.should ?? []).some(
    (clause) => clause.bool?.must_not != null && clause.bool?.filter == null
  );

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
          should: [{ term: { space_id: 'my-space' } }, actionDataFallback('my-space')],
        },
      });
    });

    // The agent-carried field must never override a Kibana-written one: a document
    // assigned to space-b by the trusted field is not readable from space-a just
    // because its round-tripped payload claims space-a.
    it('never lets action_data.space_id override an existing top-level space_id', () => {
      const filter = buildSpaceIdFilter('space-a', {
        matchActionDataSpaceId: true,
      }) as SpaceIdFilterShape;
      const fallbackClause = filter.bool?.should?.find((clause) => clause.bool?.filter != null);

      expect(fallbackClause?.bool?.must_not).toEqual({ exists: { field: 'space_id' } });
    });

    it('matches the top-level field, the missing field, and action_data in the default space', () => {
      expect(buildSpaceIdFilter('default', { matchActionDataSpaceId: true })).toEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            {
              bool: {
                must_not: [
                  { exists: { field: 'space_id' } },
                  { exists: { field: 'action_data.space_id' } },
                ],
              },
            },
            actionDataFallback('default'),
          ],
        },
      });
    });

    // Regression guard for the default-space leak: a named-space document whose
    // top-level space_id was dropped in transit still carries action_data.space_id,
    // so the missing-field allowance must not treat it as unstamped.
    it('excludes documents carrying action_data.space_id from the missing-field allowance', () => {
      const filter = buildSpaceIdFilter('default', {
        matchActionDataSpaceId: true,
      }) as SpaceIdFilterShape;
      const missingFieldClause = filter.bool?.should?.find(
        (clause) => clause.bool?.must_not != null
      );

      expect(missingFieldClause).toEqual({
        bool: {
          must_not: [
            { exists: { field: 'space_id' } },
            { exists: { field: 'action_data.space_id' } },
          ],
        },
      });
    });

    // Flag-off readers have no action_data.space_id clause to match such a document
    // with, so narrowing the allowance for them would hide legitimate default-space
    // documents instead of preventing a leak.
    it('leaves the missing-field allowance untouched for flag-off readers', () => {
      expect(buildSpaceIdFilter('default', { matchActionDataSpaceId: false })).toEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { bool: { must_not: { exists: { field: 'space_id' } } } },
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
          should: [{ term: { space_id: 'default' } }, actionDataFallback('default')],
        },
      });
      expect(hasMissingFieldAllowance(filter as SpaceIdFilterShape)).toBe(false);
    });

    it('never matches field-less documents in a named space', () => {
      const filter = buildSpaceIdFilter('my-space', {
        matchMissingSpaceId: true,
        matchActionDataSpaceId: true,
      }) as SpaceIdFilterShape;

      expect(hasMissingFieldAllowance(filter)).toBe(false);
    });
  });

  // ES defaults `minimum_should_match` to 1 only while a bool has no `must` and no
  // `filter` clause; with either present the default becomes 0 and every should
  // clause turns optional, making space scoping a no-op. The returned bool must
  // therefore never grow anything besides `should`.
  describe('minimum_should_match invariant', () => {
    const multiClauseCases: Array<[string, Parameters<typeof buildSpaceIdFilter>]> = [
      ['default space, missing-field allowance', ['default', {}]],
      ['default space, action_data fallback', ['default', { matchActionDataSpaceId: true }]],
      ['named space, action_data fallback', ['my-space', { matchActionDataSpaceId: true }]],
      [
        'default space, action_data fallback without the missing-field allowance',
        ['default', { matchMissingSpaceId: false, matchActionDataSpaceId: true }],
      ],
    ];

    it.each(multiClauseCases)('combines clauses with `should` only (%s)', (_name, args) => {
      const filter = buildSpaceIdFilter(...args) as SpaceIdFilterShape;

      expect(Object.keys(filter.bool ?? {})).toEqual(['should']);
    });
  });
});
