/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STACK_MANAGEMENT_RULES_HOST,
  ruleDetailsLocatorID,
  rulesLocatorID,
  type RulesLocatorParams,
} from '@kbn/rule-data-utils';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import { bindLocatorToHost, getLocators } from './bind_locator_to_host';

const OBSERVABILITY_HOST = {
  app: 'observabilityAlerting',
  pathPrefix: '/rules/v1',
};

const SEARCH_HOST = {
  app: 'search',
  pathPrefix: '/alerting',
};

const createMockLocator = (): LocatorPublic<RulesLocatorParams> =>
  ({
    id: 'mock',
    useUrl: jest.fn().mockReturnValue('/url'),
    getUrl: jest.fn().mockResolvedValue('/url'),
    getRedirectUrl: jest.fn().mockReturnValue('/url'),
    navigate: jest.fn().mockResolvedValue(undefined),
    navigateSync: jest.fn(),
    getLocation: jest.fn().mockResolvedValue({ app: 'management', path: '/', state: {} }),
  } as unknown as LocatorPublic<RulesLocatorParams>);

describe('bindLocatorToHost', () => {
  it('injects the bound host into locator calls', () => {
    const locator = createMockLocator();
    const bound = bindLocatorToHost(locator, SEARCH_HOST);

    bound.navigateSync({});

    expect(locator.navigateSync).toHaveBeenCalledWith({ host: SEARCH_HOST }, undefined);
  });

  it('does not override an explicit host param', () => {
    const locator = createMockLocator();
    const bound = bindLocatorToHost(locator, SEARCH_HOST);

    bound.navigateSync({ host: OBSERVABILITY_HOST });

    expect(locator.navigateSync).toHaveBeenCalledWith({ host: OBSERVABILITY_HOST }, undefined);
  });

  it('injects host into useUrl, getLocation, getUrl, getRedirectUrl, and navigate', async () => {
    const locator = createMockLocator();
    const bound = bindLocatorToHost(locator, SEARCH_HOST);
    const params = {};

    const deps = ['r-1', 1, 2];
    bound.useUrl(params, undefined, deps);
    await bound.getLocation(params);
    await bound.getUrl(params);
    bound.getRedirectUrl(params);
    await bound.navigate(params);

    const withHost = { host: SEARCH_HOST };
    expect(locator.useUrl).toHaveBeenCalledWith(withHost, undefined, deps);
    expect(locator.getLocation).toHaveBeenCalledWith(withHost);
    expect(locator.getUrl).toHaveBeenCalledWith(withHost, undefined);
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(withHost, undefined);
    expect(locator.navigate).toHaveBeenCalledWith(withHost, undefined);
  });
});

describe('getLocators', () => {
  const createShare = () => {
    const rules = createMockLocator();
    const ruleDetails = createMockLocator();
    const get = jest.fn((id: string) => {
      if (id === rulesLocatorID) {
        return rules;
      }
      if (id === ruleDetailsLocatorID) {
        return ruleDetails;
      }
      throw new Error(`unexpected locator id: ${id}`);
    });
    return {
      share: { url: { locators: { get } } } as unknown as Parameters<typeof getLocators>[0],
      rules,
      ruleDetails,
    };
  };

  it('binds rules and ruleDetails to the same host', () => {
    const { share, rules, ruleDetails } = createShare();
    const bound = getLocators(share, OBSERVABILITY_HOST);

    bound.rules.navigateSync({});
    bound.ruleDetails.navigateSync({ ruleId: 'r-1' });

    expect(rules.navigateSync).toHaveBeenCalledWith({ host: OBSERVABILITY_HOST }, undefined);
    expect(ruleDetails.navigateSync).toHaveBeenCalledWith(
      { ruleId: 'r-1', host: OBSERVABILITY_HOST },
      undefined
    );
  });

  it('observability and stack management bindings do not clobber the global locator', () => {
    const { share, rules } = createShare();
    const obsBound = getLocators(share, OBSERVABILITY_HOST);
    const smBound = getLocators(share, STACK_MANAGEMENT_RULES_HOST);

    obsBound.rules.navigateSync({});
    smBound.rules.navigateSync({});

    expect(rules.navigateSync).toHaveBeenNthCalledWith(1, { host: OBSERVABILITY_HOST }, undefined);
    expect(rules.navigateSync).toHaveBeenNthCalledWith(
      2,
      { host: STACK_MANAGEMENT_RULES_HOST },
      undefined
    );
  });
});
