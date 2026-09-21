/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic, SharePluginStart } from '@kbn/share-plugin/public';
import type {
  LocatorHost,
  RuleDetailsLocatorParams,
  RulesLocatorParams,
} from '@kbn/rule-data-utils';
import { ruleDetailsLocatorID, rulesLocatorID } from '@kbn/rule-data-utils';

interface HostParams extends SerializableRecord {
  host?: LocatorHost;
}

export const bindLocatorToHost = <P extends HostParams>(
  locator: LocatorPublic<P>,
  host: LocatorHost
): LocatorPublic<P> => {
  const withHost = (params: P): P => ({
    ...params,
    host: params.host ?? host,
  });

  const bound = Object.create(locator) as LocatorPublic<P>;
  bound.getLocation = (params) => locator.getLocation(withHost(params));
  bound.getUrl = (params, getUrlParams) => locator.getUrl(withHost(params), getUrlParams);
  bound.getRedirectUrl = (params, options) => locator.getRedirectUrl(withHost(params), options);
  bound.navigate = (params, navigationParams) =>
    locator.navigate(withHost(params), navigationParams);
  bound.navigateSync = (params, navigationParams) =>
    locator.navigateSync(withHost(params), navigationParams);
  bound.useUrl = (params, getUrlParams, deps) =>
    locator.useUrl(withHost(params), getUrlParams, deps);
  return bound;
};

export const getLocators = (
  share: SharePluginStart,
  host: LocatorHost
): {
  rules: LocatorPublic<RulesLocatorParams>;
  ruleDetails: LocatorPublic<RuleDetailsLocatorParams>;
} => ({
  rules: bindLocatorToHost(share.url.locators.get<RulesLocatorParams>(rulesLocatorID)!, host),
  ruleDetails: bindLocatorToHost(
    share.url.locators.get<RuleDetailsLocatorParams>(ruleDetailsLocatorID)!,
    host
  ),
});
