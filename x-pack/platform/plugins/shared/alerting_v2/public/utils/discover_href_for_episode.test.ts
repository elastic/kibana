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
import {
  DISCOVER_CONTEXT_HALF_WINDOW_MINUTES,
  getDiscoverHrefForRuleAndEpisodeTimestamp,
  getDiscoverHrefForRuleQuery,
  getDiscoverTimeRangeAroundTimestamp,
} from './discover_href_for_episode';

const getCapabilities = (show: boolean) => ({ discover_v2: { show } } as unknown as Capabilities);
const defaultUiSettingsGet = (key: string) => (key === ENABLE_ESQL ? true : false);

describe('getDiscoverTimeRangeAroundTimestamp', () => {
  it('returns undefined for missing or invalid timestamps', () => {
    expect(getDiscoverTimeRangeAroundTimestamp(undefined)).toBeUndefined();
    expect(getDiscoverTimeRangeAroundTimestamp('')).toBeUndefined();
    expect(getDiscoverTimeRangeAroundTimestamp('not-a-date')).toBeUndefined();
  });

  it('returns a ± window in ISO form around the anchor', () => {
    const anchor = '2024-06-15T12:00:00.000Z';
    const range = getDiscoverTimeRangeAroundTimestamp(anchor);
    expect(range).toEqual({
      from: '2024-06-15T11:45:00.000Z',
      to: '2024-06-15T12:15:00.000Z',
    });
    expect(DISCOVER_CONTEXT_HALF_WINDOW_MINUTES).toBe(15);
  });
});

describe('getDiscoverHrefForRuleQuery', () => {
  const timeRange = { from: 'now-7d', to: 'now' };
  const getRedirectUrl = jest.fn(() => '/app/discover#/?_a=...');
  const share = sharePluginMock.createStartContract();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  (uiSettings.get as jest.Mock).mockImplementation((key: string) =>
    key === ENABLE_ESQL ? true : false
  );

  beforeEach(() => {
    jest.clearAllMocks();
    share.url.locators.get = jest.fn().mockReturnValue({
      getRedirectUrl,
    });
  });

  it('returns undefined when rule ES|QL is missing or blank', () => {
    expect(
      getDiscoverHrefForRuleQuery({
        share,
        capabilities: getCapabilities(true),
        uiSettings,
        timeRange,
        ruleEsql: undefined,
      })
    ).toBeUndefined();
    expect(
      getDiscoverHrefForRuleQuery({
        share,
        capabilities: getCapabilities(true),
        uiSettings,
        timeRange,
        ruleEsql: '   ',
      })
    ).toBeUndefined();
    expect(share.url.locators.get).not.toHaveBeenCalled();
  });

  it('returns a URL from the Discover locator when all gates pass', () => {
    const href = getDiscoverHrefForRuleQuery({
      share,
      capabilities: getCapabilities(true),
      uiSettings,
      timeRange,
      ruleEsql: 'FROM logs | LIMIT 10',
    });

    expect(href).toBe('/app/discover#/?_a=...');
    expect(share.url.locators.get).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(getRedirectUrl).toHaveBeenCalledWith({
      timeRange,
      query: { esql: 'FROM logs | LIMIT 10' },
    });
  });

  it('returns undefined when ES|QL is disabled in UI settings', () => {
    (uiSettings.get as jest.Mock).mockImplementation((key: string) =>
      key === ENABLE_ESQL ? false : defaultUiSettingsGet(key)
    );

    expect(
      getDiscoverHrefForRuleQuery({
        share,
        capabilities: getCapabilities(true),
        uiSettings,
        timeRange,
        ruleEsql: 'FROM logs | LIMIT 10',
      })
    ).toBeUndefined();
    expect(share.url.locators.get).not.toHaveBeenCalled();
  });

  it('returns undefined when Discover is not allowed', () => {
    expect(
      getDiscoverHrefForRuleQuery({
        share,
        capabilities: getCapabilities(false),
        uiSettings,
        timeRange,
        ruleEsql: 'FROM logs | LIMIT 10',
      })
    ).toBeUndefined();
    expect(share.url.locators.get).not.toHaveBeenCalled();
  });
});

describe('getDiscoverHrefForRuleAndEpisodeTimestamp', () => {
  const getRedirectUrl = jest.fn(() => '/app/discover#/?_a=...');
  const share = sharePluginMock.createStartContract();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  (uiSettings.get as jest.Mock).mockImplementation((key: string) =>
    key === ENABLE_ESQL ? true : false
  );

  beforeEach(() => {
    jest.clearAllMocks();
    share.url.locators.get = jest.fn().mockReturnValue({
      getRedirectUrl,
    });
  });

  it('returns undefined when episode timestamp is invalid', () => {
    expect(
      getDiscoverHrefForRuleAndEpisodeTimestamp({
        share,
        capabilities: getCapabilities(true),
        uiSettings,
        ruleEsql: 'FROM logs | LIMIT 10',
        episodeIsoTimestamp: undefined,
      })
    ).toBeUndefined();
    expect(share.url.locators.get).not.toHaveBeenCalled();
  });

  it('builds URL with ±30m range around the episode timestamp', () => {
    const href = getDiscoverHrefForRuleAndEpisodeTimestamp({
      share,
      capabilities: getCapabilities(true),
      uiSettings,
      ruleEsql: 'FROM logs | LIMIT 10',
      episodeIsoTimestamp: '2024-06-15T12:00:00.000Z',
    });
    expect(href).toBe('/app/discover#/?_a=...');
    expect(getRedirectUrl).toHaveBeenCalledWith({
      timeRange: { from: '2024-06-15T11:45:00.000Z', to: '2024-06-15T12:15:00.000Z' },
      query: { esql: 'FROM logs | LIMIT 10' },
    });
  });
});
