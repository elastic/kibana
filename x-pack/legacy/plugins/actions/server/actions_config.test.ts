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

describe('ensureWhitelistedUri', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedUri(
        'https://github.com/elastic/kibana'
      )
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureWhitelistedUri(
        'https://github.com/elastic/kibana'
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"https://github.com/elastic/kibana\\" is not in the Kibana whitelist"`
    );
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureWhitelistedUri('github.com/elastic')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"github.com/elastic\\" is not in the Kibana whitelist"`
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedUri(
        'https://github.com/elastic/kibana'
      )
    ).toBeUndefined();
  });
});

describe('ensureWhitelistedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedHostname('github.com')
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureWhitelistedHostname('github.com')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target hostname \\"github.com\\" is not in the Kibana whitelist"`
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedHostname('github.com')
    ).toBeUndefined();
  });
});

describe('isWhitelistedUri', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
    };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual(true);
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual(false);
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedUri('github.com/elastic')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual(true);
  });
});

describe('isWhitelistedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsKibanaConfig = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
    };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      true
    );
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: [] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsKibanaConfig = { enabled: false, whitelistedHosts: ['github.com'] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      true
    );
  });
});
