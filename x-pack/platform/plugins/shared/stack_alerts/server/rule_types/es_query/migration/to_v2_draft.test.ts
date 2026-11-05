/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildV2Draft } from '@kbn/alerting-plugin/server';
import { createRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import { Comparator } from '../../../../common/comparator_types';
import { toV2Draft } from './to_v2_draft';

const esqlParams: EsQueryRuleParams = {
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.GT,
  threshold: [0],
  esqlQuery: { esql: 'FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count > 10' },
  excludeHitsFromPreviousRun: false,
  searchType: 'esqlQuery',
  aggType: 'count',
  groupBy: 'all',
  timeField: 'event.ingested',
  searchConfiguration: {},
  esQuery: '',
  index: [],
};

describe('toV2Draft', () => {
  it('converts the params of an ES|QL rule', () => {
    expect(toV2Draft(esqlParams)).toEqual({
      query: {
        base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
        breach: { segment: '| WHERE count > 10' },
      },
      time_field: 'event.ingested',
      lookback: '5m',
    });
  });

  it('builds a draft that passes alerting v2 create validation', () => {
    const draft = buildV2Draft(
      { name: 'High error count', tags: [], schedule: { interval: '1m' }, params: esqlParams },
      { toV2Draft }
    );

    expect(createRuleDataSchema.safeParse(draft).success).toBe(true);
  });

  it('falls back to the default time field', () => {
    const { timeField, ...params } = esqlParams;

    expect(toV2Draft(params).time_field).toBe('@timestamp');
  });

  describe('query', () => {
    it.each([
      ['has no STATS or WHERE', 'FROM logs-* | LIMIT 10'],
      ['has STATS but no WHERE', 'FROM logs-* | STATS count = COUNT(*) BY host.name'],
      [
        'only filters before its STATS',
        'FROM logs-* | WHERE env == "prod" | STATS count = COUNT(*) BY host.name',
      ],
      ['has no base before its condition', '| WHERE count > 10'],
      ['cannot be parsed', 'this is not esql'],
    ])('keeps the whole query as the base when it %s', (_, esql) => {
      const { query } = toV2Draft({ ...esqlParams, esqlQuery: { esql } });

      expect(query).toEqual({ base: esql });
    });

    it('splits a query without STATS at its trailing WHERE', () => {
      const { query } = toV2Draft({
        ...esqlParams,
        esqlQuery: { esql: 'FROM logs-* | WHERE log.level == "error"' },
      });

      expect(query).toEqual({
        base: 'FROM logs-*',
        breach: { segment: '| WHERE log.level == "error"' },
      });
    });
  });

  describe('grouping', () => {
    it('groups by the STATS BY fields of a per-row rule', () => {
      expect(toV2Draft({ ...esqlParams, groupBy: 'row' }).grouping).toEqual({
        fields: ['host.name'],
      });
    });

    it('does not group a rule that raises a single alert', () => {
      expect(toV2Draft(esqlParams).grouping).toBeUndefined();
    });

    it('does not group a per-row rule without STATS BY', () => {
      const params: EsQueryRuleParams = {
        ...esqlParams,
        groupBy: 'row',
        esqlQuery: { esql: 'FROM logs-* | LIMIT 10' },
      };

      expect(toV2Draft(params).grouping).toBeUndefined();
    });
  });

  describe('unsupported rules', () => {
    it.each(['esQuery', 'searchSource'] as const)('throws for a %s rule', (searchType) => {
      expect(() => toV2Draft({ ...esqlParams, searchType })).toThrow(
        `Only Elasticsearch query rules that use ES|QL can be migrated to alerting v2. This rule uses "${searchType}".`
      );
    });
  });
});
