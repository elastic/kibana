/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionsKibanaConfig,
  getActionsConfigurationUtilities,
  WhitelistedHosts,
  NotWhitelistedError,
} from './actions_config';

describe('isWhitelistedUri', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: WhitelistedHosts.Any };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual('https://github.com/elastic/kibana');
  });

  test('returns a NotWhitelistedError when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual(new NotWhitelistedError('target url not in whitelist'));
  });

  test('returns a NotWhitelistedError when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedUri('github.com/elastic')).toEqual(
      new NotWhitelistedError('target url not in whitelist')
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual('https://github.com/elastic/kibana');
  });
});

describe('isWhitelistedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: WhitelistedHosts.Any };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      'github.com'
    );
  });

  test('returns false when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      new NotWhitelistedError('target url not in whitelist')
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      'github.com'
    );
  });
});
