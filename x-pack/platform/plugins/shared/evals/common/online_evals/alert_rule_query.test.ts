/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryRuleParamsSchema } from '@kbn/response-ops-rule-params/es_query';
import {
  buildOnlineEvalAlertDrillDownPath,
  buildOnlineEvalAlertEsql,
  buildOnlineEvalAlertRuleParams,
  escapeEsqlString,
  getDefaultAlertTrigger,
} from './alert_rule_query';

const baseOptions = {
  monitorId: 'workflow-1',
  spaceId: 'space-a',
  metric: 'factuality',
  threshold: 0.7,
  trigger: 'below' as const,
  minSampleSize: 20,
  windowSize: 24,
  windowUnit: 'h' as const,
};

describe('alert_rule_query', () => {
  describe('buildOnlineEvalAlertEsql', () => {
    it('filters on monitor, space and metric and gates on sample size and threshold', () => {
      expect(buildOnlineEvalAlertEsql(baseOptions)).toBe(
        [
          'FROM .evaluation-online-scores',
          '| WHERE monitor.id == "workflow-1" AND MV_CONTAINS(space_ids, "space-a") AND score.name == "factuality"',
          '| STATS avg_score = AVG(score.value), n = COUNT(score.value)',
          '| WHERE n >= 20 AND avg_score < 0.7',
        ].join('\n')
      );
    });

    it('uses the > comparator when the regression is upwards', () => {
      expect(buildOnlineEvalAlertEsql({ ...baseOptions, trigger: 'above' })).toContain(
        'avg_score > 0.7'
      );
    });

    it('never allows a minimum sample size below one', () => {
      expect(buildOnlineEvalAlertEsql({ ...baseOptions, minSampleSize: 0 })).toContain('n >= 1 ');
      expect(buildOnlineEvalAlertEsql({ ...baseOptions, minSampleSize: 2.9 })).toContain('n >= 2 ');
    });

    it('escapes quotes so a metric name cannot break out of the string literal', () => {
      const esql = buildOnlineEvalAlertEsql({ ...baseOptions, metric: 'a" OR true //' });
      expect(esql).toContain('score.name == "a\\" OR true //"');
    });
  });

  describe('escapeEsqlString', () => {
    it('escapes backslashes, quotes and control characters', () => {
      expect(escapeEsqlString('a\\b"c\nd\te\r')).toBe('a\\\\b\\"c\\nd\\te\\r');
    });
  });

  describe('getDefaultAlertTrigger', () => {
    it.each([
      ['maximize', 'below'],
      [undefined, 'below'],
      ['minimize', 'above'],
      ['neutral', 'below'],
    ] as const)('maps direction %s to %s', (direction, expected) => {
      expect(getDefaultAlertTrigger(direction)).toBe(expected);
    });
  });

  describe('buildOnlineEvalAlertRuleParams', () => {
    it('produces an ES|QL .es-query params object firing on any returned row', () => {
      expect(buildOnlineEvalAlertRuleParams(baseOptions)).toEqual({
        searchType: 'esqlQuery',
        esqlQuery: { esql: buildOnlineEvalAlertEsql(baseOptions) },
        timeField: '@timestamp',
        timeWindowSize: 24,
        timeWindowUnit: 'h',
        threshold: [0],
        thresholdComparator: '>',
        size: 0,
        excludeHitsFromPreviousRun: false,
        aggType: 'count',
        groupBy: 'all',
      });
    });

    it('produces params accepted by the .es-query rule params schema', () => {
      expect(() =>
        EsQueryRuleParamsSchema.validate(buildOnlineEvalAlertRuleParams(baseOptions))
      ).not.toThrow();
      expect(() =>
        EsQueryRuleParamsSchema.validate(
          buildOnlineEvalAlertRuleParams({ ...baseOptions, trigger: 'above', windowUnit: 'd' })
        )
      ).not.toThrow();
    });
  });

  describe('buildOnlineEvalAlertDrillDownPath', () => {
    it('links to the detail page narrowed to the window and metric', () => {
      expect(
        buildOnlineEvalAlertDrillDownPath({
          workflowId: 'workflow 1',
          metric: 'factuality',
          windowSize: 24,
          windowUnit: 'h',
        })
      ).toBe('/online/workflow%201?from=now-24h&to=now&metric=factuality');
    });
  });
});
