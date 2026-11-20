/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  ALERT_URL,
  ES_QUERY_ID,
  INDEX_THRESHOLD_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  getClassicAlertDiscoverTarget,
  hasDiscoverLinkResolver,
  STACK_DISCOVER_LINK_RESOLVERS,
} from './get_classic_alert_discover_target';

const resolve = (alert: Record<string, unknown>) =>
  getClassicAlertDiscoverTarget(alert, STACK_DISCOVER_LINK_RESOLVERS);

describe('getClassicAlertDiscoverTarget', () => {
  describe('ES query rule', () => {
    it('returns the Discover link the rule stored on the alert', () => {
      expect(
        resolve({
          [ALERT_RULE_TYPE_ID]: ES_QUERY_ID,
          [ALERT_URL]: '/s/default/app/r?l=DISCOVER_APP_LOCATOR',
        })
      ).toEqual({ url: '/s/default/app/r?l=DISCOVER_APP_LOCATOR' });
    });

    it('returns undefined when the alert has no stored link', () => {
      expect(resolve({ [ALERT_RULE_TYPE_ID]: ES_QUERY_ID })).toBeUndefined();
    });
  });

  describe('index threshold rule', () => {
    const baseParams = {
      index: ['logs-a', 'logs-b'],
      timeField: 'event.ingested',
      groupBy: 'top',
      termField: 'host.name',
    };

    it('opens the rule indices, KQL filter and the alert group', () => {
      expect(
        resolve({
          [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
          [ALERT_INSTANCE_ID]: 'web-1',
          [ALERT_RULE_PARAMETERS]: { ...baseParams, filterKuery: 'log.level: "error"' },
        })
      ).toEqual({
        locatorParams: {
          dataViewSpec: { title: 'logs-a,logs-b', timeFieldName: 'event.ingested' },
          query: { query: 'log.level: "error"', language: 'kuery' },
          filters: [{ meta: {}, query: { match_phrase: { 'host.name': 'web-1' } } }],
        },
      });
    });

    it('skips the group filter for multi-term groups, whose instance id joins the values', () => {
      expect(
        resolve({
          [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
          [ALERT_INSTANCE_ID]: 'web-1,us-east',
          [ALERT_RULE_PARAMETERS]: { ...baseParams, termField: ['host.name', 'cloud.region'] },
        })
      ).toEqual({
        locatorParams: {
          dataViewSpec: { title: 'logs-a,logs-b', timeFieldName: 'event.ingested' },
          filters: [],
        },
      });
    });

    it('skips the group filter when the rule aggregates all documents', () => {
      expect(
        resolve({
          [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
          [ALERT_INSTANCE_ID]: 'all documents',
          [ALERT_RULE_PARAMETERS]: { ...baseParams, groupBy: 'all' },
        })
      ).toEqual({
        locatorParams: {
          dataViewSpec: { title: 'logs-a,logs-b', timeFieldName: 'event.ingested' },
          filters: [],
        },
      });
    });

    it('opens the rule lookback window ending at the last evaluation of an active alert', () => {
      const target = resolve({
        [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
        [TIMESTAMP]: '2026-11-20T12:00:00.000Z',
        [ALERT_RULE_PARAMETERS]: { ...baseParams, timeWindowSize: 1, timeWindowUnit: 'h' },
      });

      expect(target).toMatchObject({
        locatorParams: {
          timeRange: { from: '2026-11-20T11:00:00.000Z', to: '2026-11-20T12:00:00.000Z' },
        },
      });
    });

    it('ends the window at the recovery time of a recovered alert', () => {
      const target = resolve({
        [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
        [TIMESTAMP]: '2026-11-20T14:00:00.000Z',
        [ALERT_END]: '2026-11-20T13:30:00.000Z',
        [ALERT_RULE_PARAMETERS]: { ...baseParams, timeWindowSize: 5, timeWindowUnit: 'm' },
      });

      expect(target).toMatchObject({
        locatorParams: {
          timeRange: { from: '2026-11-20T13:25:00.000Z', to: '2026-11-20T13:30:00.000Z' },
        },
      });
    });

    it('leaves the time range to the caller when the rule window is invalid', () => {
      const target = resolve({
        [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
        [TIMESTAMP]: '2026-11-20T12:00:00.000Z',
        [ALERT_RULE_PARAMETERS]: { ...baseParams, timeWindowSize: 1, timeWindowUnit: 'w' },
      });

      expect(target).toEqual({
        locatorParams: {
          dataViewSpec: { title: 'logs-a,logs-b', timeFieldName: 'event.ingested' },
          filters: [],
        },
      });
    });

    it('returns undefined without indices or a time field', () => {
      expect(
        resolve({
          [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
          [ALERT_RULE_PARAMETERS]: { index: [], timeField: 'event.ingested' },
        })
      ).toBeUndefined();
      expect(
        resolve({
          [ALERT_RULE_TYPE_ID]: INDEX_THRESHOLD_ID,
          [ALERT_RULE_PARAMETERS]: { index: 'logs-a' },
        })
      ).toBeUndefined();
    });
  });

  it('returns undefined for rule types without a resolver', () => {
    expect(resolve({ [ALERT_RULE_TYPE_ID]: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID })).toBeUndefined();
  });

  it('uses resolvers contributed for other rule types', () => {
    const alert = { [ALERT_RULE_TYPE_ID]: 'host.rule' };
    const hostResolver = jest.fn(() => ({ url: '/app/discover#/host' }));

    expect(
      getClassicAlertDiscoverTarget(alert, {
        ...STACK_DISCOVER_LINK_RESOLVERS,
        'host.rule': hostResolver,
      })
    ).toEqual({ url: '/app/discover#/host' });
    expect(hostResolver).toHaveBeenCalledWith(alert);
  });
});

describe('hasDiscoverLinkResolver', () => {
  it('only matches own rule type keys', () => {
    expect(hasDiscoverLinkResolver(STACK_DISCOVER_LINK_RESOLVERS, ES_QUERY_ID)).toBe(true);
    expect(hasDiscoverLinkResolver(STACK_DISCOVER_LINK_RESOLVERS, 'toString')).toBe(false);
    expect(hasDiscoverLinkResolver(STACK_DISCOVER_LINK_RESOLVERS, undefined)).toBe(false);
  });
});
