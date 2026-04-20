/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { buildRuleEventsEsql, getDiscoverHrefForRuleEvents } from './discover_href_for_rule_events';

const getCapabilities = (show: boolean) => ({ discover_v2: { show } } as unknown as Capabilities);

describe('buildRuleEventsEsql', () => {
  it('returns undefined when ruleIds is empty', () => {
    expect(buildRuleEventsEsql({ ruleIds: [] })).toBeUndefined();
  });

  it('escapes double-quotes and backslashes inside rule ids', () => {
    const esql = buildRuleEventsEsql({ ruleIds: ['rule"a', 'rule\\b'] });
    expect(esql).toContain('"rule\\"a"');
    expect(esql).toContain('"rule\\\\b"');
  });

  it('filters by type, statuses, and rule.id', () => {
    const esql = buildRuleEventsEsql({ ruleIds: ['rule-a', 'rule-b'] });
    expect(esql).toContain('FROM .rule-events');
    expect(esql).toContain('type == "alert"');
    expect(esql).toContain('status IN ("breached", "recovered")');
    expect(esql).toContain('`rule.id` IN ("rule-a", "rule-b")');
  });
});

describe('getDiscoverHrefForRuleEvents', () => {
  const timeRange = { from: 'now-30d', to: 'now' };
  const getRedirectUrl = jest.fn(() => '/app/discover#/?_a=...');
  const share = sharePluginMock.createStartContract();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  (uiSettings.get as jest.Mock).mockImplementation((key: string) =>
    key === ENABLE_ESQL ? true : false
  );

  beforeEach(() => {
    jest.clearAllMocks();
    share.url.locators.get = jest.fn().mockReturnValue({ getRedirectUrl });
  });

  it('returns undefined when ruleIds is empty', () => {
    expect(
      getDiscoverHrefForRuleEvents({
        share,
        capabilities: getCapabilities(true),
        uiSettings,
        ruleIds: [],
        timeRange,
      })
    ).toBeUndefined();
    expect(share.url.locators.get).not.toHaveBeenCalled();
  });

  it('returns a URL from the Discover locator when all gates pass', () => {
    const href = getDiscoverHrefForRuleEvents({
      share,
      capabilities: getCapabilities(true),
      uiSettings,
      ruleIds: ['rule-a'],
      timeRange,
    });
    expect(href).toBe('/app/discover#/?_a=...');
    expect(share.url.locators.get).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(getRedirectUrl).toHaveBeenCalledWith({
      timeRange,
      query: {
        esql: expect.stringContaining('`rule.id` IN ("rule-a")'),
      },
    });
  });

  it('returns undefined when ES|QL is disabled in UI settings', () => {
    (uiSettings.get as jest.Mock).mockImplementation((key: string) =>
      key === ENABLE_ESQL ? false : false
    );
    expect(
      getDiscoverHrefForRuleEvents({
        share,
        capabilities: getCapabilities(true),
        uiSettings,
        ruleIds: ['rule-a'],
        timeRange,
      })
    ).toBeUndefined();
    expect(share.url.locators.get).not.toHaveBeenCalled();
  });

  it('returns undefined when Discover is not allowed', () => {
    (uiSettings.get as jest.Mock).mockImplementation((key: string) =>
      key === ENABLE_ESQL ? true : false
    );
    expect(
      getDiscoverHrefForRuleEvents({
        share,
        capabilities: getCapabilities(false),
        uiSettings,
        ruleIds: ['rule-a'],
        timeRange,
      })
    ).toBeUndefined();
    expect(share.url.locators.get).not.toHaveBeenCalled();
  });

  it('returns undefined when the Discover locator is not registered', () => {
    (uiSettings.get as jest.Mock).mockImplementation((key: string) =>
      key === ENABLE_ESQL ? true : false
    );
    share.url.locators.get = jest.fn().mockReturnValue(undefined);
    expect(
      getDiscoverHrefForRuleEvents({
        share,
        capabilities: getCapabilities(true),
        uiSettings,
        ruleIds: ['rule-a'],
        timeRange,
      })
    ).toBeUndefined();
  });
});
