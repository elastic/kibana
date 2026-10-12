/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bindLocatorToHost, bindLocatorsToHost } from './bind_locators_to_host';
import {
  createAlertingV2HostApp,
  MANAGEMENT_HOST,
  type AlertingV2RulesLocatorParams,
} from '../locators';
import type { AlertingV2Locators } from './locator_context';
import type { LocatorPublic } from '@kbn/share-plugin/public';

const createMockLocator = (): LocatorPublic<AlertingV2RulesLocatorParams> =>
  ({
    id: 'mock',
    useUrl: jest.fn().mockReturnValue('/url'),
    getUrl: jest.fn().mockResolvedValue('/url'),
    getRedirectUrl: jest.fn().mockReturnValue('/url'),
    navigate: jest.fn().mockResolvedValue(undefined),
    navigateSync: jest.fn(),
    getLocation: jest.fn().mockResolvedValue({ app: 'management', path: '/', state: {} }),
  }) as unknown as LocatorPublic<AlertingV2RulesLocatorParams>;

const SEARCH_HOST = createAlertingV2HostApp('search', {
  rules: '/alerting',
  ruleLibrary: '/alerting/library',
  episodes: '/alerting/inbox',
  actionPolicies: '/alerting/action-policies',
  executionHistory: '/alerting/execution-history',
});

const OBSERVABILITY_HOST = createAlertingV2HostApp('observability', {
  rules: '/alerting',
  ruleLibrary: '/alerting/library',
  episodes: '/alerting/inbox',
  actionPolicies: '/alerting/action-policies',
  executionHistory: '/alerting/execution-history',
});

describe('bindLocatorToHost', () => {
  it('injects the bound host into locator calls', () => {
    const locator = createMockLocator();
    const bound = bindLocatorToHost(locator, SEARCH_HOST.rules);

    bound.navigateSync({ ruleId: 'r-1' });

    expect(locator.navigateSync).toHaveBeenCalledWith(
      { ruleId: 'r-1', host: SEARCH_HOST.rules },
      undefined
    );
  });

  it('does not override an explicit host param', () => {
    const locator = createMockLocator();
    const bound = bindLocatorToHost(locator, SEARCH_HOST.rules);

    bound.navigateSync({ ruleId: 'r-1', host: OBSERVABILITY_HOST.rules });

    expect(locator.navigateSync).toHaveBeenCalledWith(
      { ruleId: 'r-1', host: OBSERVABILITY_HOST.rules },
      undefined
    );
  });

  it('injects host into useUrl, getLocation, getUrl, getRedirectUrl, and navigate', async () => {
    const locator = createMockLocator();
    const bound = bindLocatorToHost(locator, SEARCH_HOST.rules);
    const params = { ruleId: 'r-1' };

    const deps = ['r-1', 1, 2];
    bound.useUrl(params, undefined, deps);
    await bound.getLocation(params);
    await bound.getUrl(params);
    bound.getRedirectUrl(params);
    await bound.navigate(params);

    const withHost = { ruleId: 'r-1', host: SEARCH_HOST.rules };
    expect(locator.useUrl).toHaveBeenCalledWith(withHost, undefined, deps);
    expect(locator.getLocation).toHaveBeenCalledWith(withHost);
    expect(locator.getUrl).toHaveBeenCalledWith(withHost, undefined);
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(withHost, undefined);
    expect(locator.navigate).toHaveBeenCalledWith(withHost, undefined);
  });
});

describe('bindLocatorsToHost', () => {
  it('binds each page locator to the matching host entry', () => {
    const locators = {
      rulesLocators: createMockLocator(),
      ruleLibraryLocators: createMockLocator(),
      episodesLocators: createMockLocator(),
      actionPolicyLocators: createMockLocator(),
      executionHistoryLocators: createMockLocator(),
    } as unknown as AlertingV2Locators;

    const bound = bindLocatorsToHost(locators, SEARCH_HOST);
    bound.rulesLocators.navigateSync({});
    bound.episodesLocators.navigateSync({});

    expect(locators.rulesLocators.navigateSync).toHaveBeenCalledWith(
      { host: SEARCH_HOST.rules },
      undefined
    );
    expect(locators.episodesLocators.navigateSync).toHaveBeenCalledWith(
      { host: SEARCH_HOST.episodes },
      undefined
    );
  });

  it('observability and search bindings do not clobber each other', () => {
    const locators = {
      rulesLocators: createMockLocator(),
      ruleLibraryLocators: createMockLocator(),
      episodesLocators: createMockLocator(),
      actionPolicyLocators: createMockLocator(),
      executionHistoryLocators: createMockLocator(),
    } as unknown as AlertingV2Locators;

    const obsBound = bindLocatorsToHost(locators, OBSERVABILITY_HOST);
    const searchBound = bindLocatorsToHost(locators, SEARCH_HOST);

    obsBound.rulesLocators.navigateSync({ ruleId: 'r-1' });
    searchBound.rulesLocators.navigateSync({ ruleId: 'r-1' });

    expect(locators.rulesLocators.navigateSync).toHaveBeenNthCalledWith(
      1,
      { ruleId: 'r-1', host: OBSERVABILITY_HOST.rules },
      undefined
    );
    expect(locators.rulesLocators.navigateSync).toHaveBeenNthCalledWith(
      2,
      { ruleId: 'r-1', host: SEARCH_HOST.rules },
      undefined
    );
  });

  it('management host binding injects MANAGEMENT_HOST page paths', () => {
    const locators = {
      rulesLocators: createMockLocator(),
      ruleLibraryLocators: createMockLocator(),
      episodesLocators: createMockLocator(),
      actionPolicyLocators: createMockLocator(),
      executionHistoryLocators: createMockLocator(),
    } as unknown as AlertingV2Locators;

    bindLocatorsToHost(locators, MANAGEMENT_HOST).rulesLocators.navigateSync({});

    expect(locators.rulesLocators.navigateSync).toHaveBeenCalledWith(
      { host: MANAGEMENT_HOST.rules },
      undefined
    );
  });
});
