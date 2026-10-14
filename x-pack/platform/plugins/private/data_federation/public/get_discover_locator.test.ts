/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { getDiscoverLocator } from './get_discover_locator';

const locator = { getRedirectUrl: jest.fn() };
const get = jest.fn(() => locator);
const share = { url: { locators: { get } } } as unknown as SharePluginStart;

const withDiscover = (show?: boolean) =>
  ({ discover_v2: show === undefined ? undefined : { show } } as unknown as Capabilities);

describe('getDiscoverLocator', () => {
  beforeEach(() => get.mockClear());

  it('returns the Discover locator when the user can access Discover', () => {
    expect(getDiscoverLocator(withDiscover(true), share)).toBe(locator);
    expect(get).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
  });

  it('returns undefined when the user cannot access Discover', () => {
    expect(getDiscoverLocator(withDiscover(false), share)).toBeUndefined();
    expect(getDiscoverLocator(withDiscover(), share)).toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

  it('returns undefined when the share plugin is unavailable', () => {
    expect(getDiscoverLocator(withDiscover(true))).toBeUndefined();
  });
});
