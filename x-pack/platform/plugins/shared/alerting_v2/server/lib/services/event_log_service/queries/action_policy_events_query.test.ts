/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../../../dispatcher/steps/constants';
import {
  buildFindActionPolicyEventsQuery,
  type BuildActionPolicyEventsQueryParams,
} from './action_policy_events_query';

const SINCE = '2026-05-04T00:00:00Z';

const filtersOf = (body: SearchRequest) =>
  ((body.query as { bool: { filter: QueryDslQueryContainer[] } }).bool.filter ??
    []) as QueryDslQueryContainer[];

const hasBoolShould = (filter: QueryDslQueryContainer | undefined) =>
  Boolean(filter?.bool && Array.isArray(filter.bool.should));

const baseParams = { spaceId: 'default', startDate: SINCE } as const;

/**
 * The shared filter and sort logic (see `buildBaseActionPolicyEventsQuery`) is
 * exercised through the find helper; `buildShared` supplies a fixed page/size so
 * each case only overrides the filter inputs under test.
 */
const buildShared = (params: Partial<BuildActionPolicyEventsQueryParams> = {}): SearchRequest =>
  buildFindActionPolicyEventsQuery({ ...baseParams, page: 1, perPage: 25, ...params });

describe('action policy events queries', () => {
  describe('shared filters', () => {
    it('always filters on event.provider=alerting_v2 and the request space id', () => {
      const filters = filtersOf(buildShared());
      expect(filters).toEqual(
        expect.arrayContaining([
          { term: { 'event.provider': ACTION_POLICY_EVENT_PROVIDER } },
          { term: { 'kibana.space_ids': 'default' } },
        ])
      );
    });

    it('forwards the provided space id into the kibana.space_ids term filter', () => {
      const filters = filtersOf(buildShared({ spaceId: 'my-space' }));
      expect(filters).toEqual(
        expect.arrayContaining([{ term: { 'kibana.space_ids': 'my-space' } }])
      );
    });

    it('applies @timestamp >= startDate as a range filter', () => {
      const filters = filtersOf(buildShared());
      expect(filters).toEqual(
        expect.arrayContaining([{ range: { '@timestamp': { gte: SINCE } } }])
      );
    });

    it('matches dispatched, throttled, and dispatch_failed when outcomes is omitted', () => {
      const filters = filtersOf(buildShared());
      expect(filters).toEqual(
        expect.arrayContaining([
          {
            terms: {
              'event.action': [
                ACTION_POLICY_EVENT_ACTIONS.DISPATCHED,
                ACTION_POLICY_EVENT_ACTIONS.THROTTLED,
                ACTION_POLICY_EVENT_ACTIONS.DISPATCH_FAILED,
              ],
            },
          },
        ])
      );
    });

    it('narrows event.action to the provided outcomes', () => {
      const filters = filtersOf(buildShared({ outcomes: ['throttled'] }));
      expect(filters).toEqual(
        expect.arrayContaining([{ terms: { 'event.action': ['throttled'] } }])
      );
    });

    it('omits the id clause when no ids are provided', () => {
      const filters = filtersOf(buildShared());
      expect(filters.find(hasBoolShould)).toBeUndefined();
    });

    it('omits the id clause when both id arrays are empty', () => {
      const filters = filtersOf(buildShared({ policyIds: [], ruleIds: [] }));
      expect(filters.find(hasBoolShould)).toBeUndefined();
    });

    it('matches policy ids against the action_policy saved-object type only', () => {
      const filters = filtersOf(buildShared({ policyIds: ['p1'] }));
      const boolFilter = filters.find(hasBoolShould);
      expect(boolFilter).toBeDefined();
      const should = (boolFilter?.bool?.should ?? []) as QueryDslQueryContainer[];
      expect(should).toEqual(
        expect.arrayContaining([
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.saved_objects.type': 'alerting_action_policy' } },
                    { terms: { 'kibana.saved_objects.id': ['p1'] } },
                  ],
                },
              },
            },
          },
        ])
      );
    });

    it('matches rule ids against the alerting_rule saved-object type only', () => {
      const filters = filtersOf(buildShared({ ruleIds: ['r1', 'r2'] }));
      const boolFilter = filters.find(hasBoolShould);
      const should = (boolFilter?.bool?.should ?? []) as QueryDslQueryContainer[];
      expect(should).toEqual(
        expect.arrayContaining([
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.saved_objects.type': 'alerting_rule' } },
                    { terms: { 'kibana.saved_objects.id': ['r1', 'r2'] } },
                  ],
                },
              },
            },
          },
        ])
      );
    });

    it('keeps policy and rule nested clauses separate so a shared id never crosses types', () => {
      const filters = filtersOf(buildShared({ policyIds: ['shared-id'], ruleIds: ['shared-id'] }));
      const should = (filters.find(hasBoolShould)?.bool?.should ?? []) as QueryDslQueryContainer[];
      // Two type-keyed nested clauses — the shared id is projected onto
      // each SO type separately, never as a single clause that lets the
      // id match across types.
      expect(should).toEqual(
        expect.arrayContaining([
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.saved_objects.type': 'alerting_action_policy' } },
                    { terms: { 'kibana.saved_objects.id': ['shared-id'] } },
                  ],
                },
              },
            },
          },
          {
            nested: {
              path: 'kibana.saved_objects',
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.saved_objects.type': 'alerting_rule' } },
                    { terms: { 'kibana.saved_objects.id': ['shared-id'] } },
                  ],
                },
              },
            },
          },
        ])
      );
    });

    it('adds a rule_ids spillover clause only when ruleIds are provided', () => {
      const filtersWithRules = filtersOf(buildShared({ ruleIds: ['r1'] }));
      const filtersWithoutRules = filtersOf(buildShared({ policyIds: ['p1'] }));

      const withShould = (filtersWithRules.find(hasBoolShould)?.bool?.should ??
        []) as QueryDslQueryContainer[];
      const withoutShould = (filtersWithoutRules.find(hasBoolShould)?.bool?.should ??
        []) as QueryDslQueryContainer[];

      expect(withShould).toEqual(
        expect.arrayContaining([{ terms: { 'kibana.alerting_v2.dispatcher.rule_ids': ['r1'] } }])
      );
      expect(
        withoutShould.find((clause) =>
          Boolean(
            clause?.terms && 'kibana.alerting_v2.dispatcher.rule_ids' in (clause.terms as object)
          )
        )
      ).toBeUndefined();
    });

    it('uses minimum_should_match=1 on the should clause', () => {
      const filters = filtersOf(buildShared({ ruleIds: ['r1'] }));
      const boolFilter = filters.find(hasBoolShould);
      expect(boolFilter?.bool?.minimum_should_match).toBe(1);
    });

    describe('mandatoryRuleIds', () => {
      it('adds an AND filter with a nested SO clause and a spillover terms clause', () => {
        const filters = filtersOf(buildShared({ mandatoryRuleIds: ['r1', 'r2'] }));

        // A second bool.should clause exists alongside the search-derived one
        // (which is absent here). Locate the mandatory clause by inspecting
        // its `should` entries.
        const shoulds = filters.filter(hasBoolShould);
        const mandatoryClause = shoulds.find((queryContainer) =>
          (queryContainer?.bool?.should as QueryDslQueryContainer[] | undefined)?.some(
            (shouldClause) =>
              Boolean(
                shouldClause?.terms &&
                  'kibana.alerting_v2.dispatcher.rule_ids' in (shouldClause.terms as object)
              )
          )
        );

        expect(mandatoryClause).toBeDefined();
        expect(mandatoryClause?.bool?.minimum_should_match).toBe(1);

        const shouldClauses = (mandatoryClause?.bool?.should ?? []) as QueryDslQueryContainer[];
        expect(shouldClauses).toEqual(
          expect.arrayContaining([
            { terms: { 'kibana.alerting_v2.dispatcher.rule_ids': ['r1', 'r2'] } },
          ])
        );

        const nestedClause = shouldClauses.find((c) => Boolean(c?.nested));
        expect(nestedClause?.nested?.path).toBe('kibana.saved_objects');
      });

      it('is independent from search-derived ruleIds — both clauses coexist (AND)', () => {
        const filters = filtersOf(
          buildShared({ ruleIds: ['r-search'], mandatoryRuleIds: ['r-explicit'] })
        );

        const shoulds = filters.filter(hasBoolShould);

        expect(shoulds.length).toBe(2);
      });

      it('is omitted when mandatoryRuleIds is empty', () => {
        const filtersEmpty = filtersOf(buildShared({ mandatoryRuleIds: [] }));

        const filtersUndefined = filtersOf(buildShared());

        expect(filtersEmpty.length).toBe(filtersUndefined.length);
      });
    });

    describe('episodeIds', () => {
      it('adds an AND terms filter on episode_ids when episodeIds are provided', () => {
        const filters = filtersOf(buildShared({ episodeIds: ['ep-1', 'ep-2'] }));
        expect(filters).toEqual(
          expect.arrayContaining([
            { terms: { 'kibana.alerting_v2.dispatcher.episode_ids': ['ep-1', 'ep-2'] } },
          ])
        );
      });

      it('omits the episode_ids terms filter when episodeIds is not provided', () => {
        const filters = filtersOf(buildShared());
        expect(
          filters.find((clause) =>
            Boolean(
              clause?.terms &&
                'kibana.alerting_v2.dispatcher.episode_ids' in (clause.terms as object)
            )
          )
        ).toBeUndefined();
      });

      it('omits the episode_ids terms filter when episodeIds is empty', () => {
        const filters = filtersOf(buildShared({ episodeIds: [] }));
        expect(
          filters.find((clause) =>
            Boolean(
              clause?.terms &&
                'kibana.alerting_v2.dispatcher.episode_ids' in (clause.terms as object)
            )
          )
        ).toBeUndefined();
      });
    });

    it('sorts by @timestamp desc', () => {
      const body = buildShared();
      expect(body.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
    });

    it('sets track_total_hits=true', () => {
      const body = buildShared();
      expect(body.track_total_hits).toBe(true);
    });
  });

  describe('buildFindActionPolicyEventsQuery', () => {
    it('translates page/perPage into from/size', () => {
      const body = buildFindActionPolicyEventsQuery({ ...baseParams, page: 3, perPage: 25 });
      expect(body.from).toBe(50);
      expect(body.size).toBe(25);
    });

    it('treats page=1 as from=0', () => {
      const body = buildFindActionPolicyEventsQuery({ ...baseParams, page: 1, perPage: 20 });
      expect(body.from).toBe(0);
      expect(body.size).toBe(20);
    });

    it('supports a count-only read via perPage=0 (size=0)', () => {
      const body = buildFindActionPolicyEventsQuery({ ...baseParams, page: 1, perPage: 0 });
      expect(body.from).toBe(0);
      expect(body.size).toBe(0);
    });
  });
});
