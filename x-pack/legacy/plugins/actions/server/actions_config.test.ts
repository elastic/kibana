/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsConfigType } from './types';
import {
  getActionsConfigurationUtilities,
  WhitelistedHosts,
  EnabledActionTypes,
} from './actions_config';

describe('ensureWhitelistedUri', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
      enabledTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedUri(
        'https://github.com/elastic/kibana'
      )
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsConfigType = { enabled: false, whitelistedHosts: [], enabledTypes: [] };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureWhitelistedUri(
        'https://github.com/elastic/kibana'
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"https://github.com/elastic/kibana\\" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts"`
    );
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfigType = { enabled: false, whitelistedHosts: [], enabledTypes: [] };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureWhitelistedUri('github.com/elastic')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target url \\"github.com/elastic\\" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts"`
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: ['github.com'],
      enabledTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedUri(
        'https://github.com/elastic/kibana'
      )
    ).toBeUndefined();
  });
});

describe('ensureWhitelistedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
      enabledTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedHostname('github.com')
    ).toBeUndefined();
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsConfigType = { enabled: false, whitelistedHosts: [], enabledTypes: [] };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureWhitelistedHostname('github.com')
    ).toThrowErrorMatchingInlineSnapshot(
      `"target hostname \\"github.com\\" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts"`
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: ['github.com'],
      enabledTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).ensureWhitelistedHostname('github.com')
    ).toBeUndefined();
  });
});

describe('isWhitelistedUri', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
      enabledTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual(true);
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsConfigType = { enabled: false, whitelistedHosts: [], enabledTypes: [] };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual(false);
  });

  test('throws when the uri cannot be parsed as a valid URI', () => {
    const config: ActionsConfigType = { enabled: false, whitelistedHosts: [], enabledTypes: [] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedUri('github.com/elastic')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: ['github.com'],
      enabledTypes: [],
    };
    expect(
      getActionsConfigurationUtilities(config).isWhitelistedUri('https://github.com/elastic/kibana')
    ).toEqual(true);
  });
});

describe('isWhitelistedHostname', () => {
  test('returns true when "any" hostnames are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [WhitelistedHosts.Any],
      enabledTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      true
    );
  });

  test('throws when the hostname in the requested uri is not in the whitelist', () => {
    const config: ActionsConfigType = { enabled: false, whitelistedHosts: [], enabledTypes: [] };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      false
    );
  });

  test('returns true when the hostname in the requested uri is in the whitelist', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: ['github.com'],
      enabledTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isWhitelistedHostname('github.com')).toEqual(
      true
    );
  });
});

describe('isActionTypeEnabled', () => {
  test('returns true when "any" actionTypes are allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [],
      enabledTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });

  test('returns false when no actionType is allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [],
      enabledTypes: [],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(false);
  });

  test('returns false when the actionType is not in the enabled list', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [],
      enabledTypes: ['foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('bar')).toEqual(false);
  });

  test('returns true when the actionType is in the enabled list', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [],
      enabledTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).isActionTypeEnabled('foo')).toEqual(true);
  });
});

describe('ensureActionTypeEnabled', () => {
  test('does not throw when any actionType is allowed', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [],
      enabledTypes: ['ignore', EnabledActionTypes.Any],
    };
    expect(getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')).toBeUndefined();
  });

  test('throws when no actionType is not allowed', () => {
    const config: ActionsConfigType = { enabled: false, whitelistedHosts: [], enabledTypes: [] };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')
    ).toThrowErrorMatchingInlineSnapshot(
      `"action type \\"foo\\" is not enabled in the Kibana config xpack.actions.enabledTypes"`
    );
  });

  test('throws when actionType is not enabled', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [],
      enabledTypes: ['ignore'],
    };
    expect(() =>
      getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')
    ).toThrowErrorMatchingInlineSnapshot(
      `"action type \\"foo\\" is not enabled in the Kibana config xpack.actions.enabledTypes"`
    );
  });

  test('does not throw when actionType is enabled', () => {
    const config: ActionsConfigType = {
      enabled: false,
      whitelistedHosts: [],
      enabledTypes: ['ignore', 'foo'],
    };
    expect(getActionsConfigurationUtilities(config).ensureActionTypeEnabled('foo')).toBeUndefined();
  });
});
