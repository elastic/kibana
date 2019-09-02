/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionsKibanaConfig,
  getActionsConfigurationUtilities,
  WhitelistedHosts,
} from './actions_config';

describe('isWhitelistedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: WhitelistedHosts.Any };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedHostname(
        'https://github.com/elastic/kibana'
      )
    ).toEqual(true);
  });

  test('returns false when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedHostname(
        'https://github.com/elastic/kibana'
      )
    ).toEqual(false);
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedHostname(
        'https://github.com/elastic/kibana'
      )
    ).toEqual(true);
  });
});
