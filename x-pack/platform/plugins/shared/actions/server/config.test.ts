/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsConfig } from './config';
import { configSchema, getValidatedConfig } from './config';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('config validation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('action defaults', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "allowedHosts": Array [
          "*",
        ],
        "enableFooterInEmail": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "maxResponseContentLength": ByteSizeValue {
          "valueInBytes": 1048576,
        },
        "microsoftExchangeUrl": "https://login.microsoftonline.com",
        "microsoftGraphApiScope": "https://graph.microsoft.com/.default",
        "microsoftGraphApiUrl": "https://graph.microsoft.com/v1.0",
        "preconfigured": Object {},
        "preconfiguredAlertHistoryEsIndex": false,
        "responseTimeout": "PT1M",
      }
    `);
  });

  test('action with preconfigured actions', () => {
    const config: Record<string, unknown> = {
      preconfigured: {
        mySlack1: {
          actionTypeId: '.slack',
          name: 'Slack #xyz',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
          },
        },
      },
    };
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "allowedHosts": Array [
          "*",
        ],
        "enableFooterInEmail": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "maxResponseContentLength": ByteSizeValue {
          "valueInBytes": 1048576,
        },
        "microsoftExchangeUrl": "https://login.microsoftonline.com",
        "microsoftGraphApiScope": "https://graph.microsoft.com/.default",
        "microsoftGraphApiUrl": "https://graph.microsoft.com/v1.0",
        "preconfigured": Object {
          "mySlack1": Object {
            "actionTypeId": ".slack",
            "config": Object {
              "webhookUrl": "https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz",
            },
            "name": "Slack #xyz",
            "secrets": Object {},
          },
        },
        "preconfiguredAlertHistoryEsIndex": false,
        "responseTimeout": "PT1M",
      }
    `);
  });

  test('validates preconfigured action ids', () => {
    expect(() =>
      configSchema.validate(preConfiguredActionConfig(''))
    ).toThrowErrorMatchingInlineSnapshot(
      `"[preconfigured]: invalid preconfigured action id \\"\\""`
    );

    expect(() =>
      configSchema.validate(preConfiguredActionConfig('constructor'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"[preconfigured]: invalid preconfigured action id \\"constructor\\""`
    );

    expect(() =>
      configSchema.validate(preConfiguredActionConfig('__proto__'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"[preconfigured]: invalid preconfigured action id \\"__proto__\\""`
    );
  });

  test('validates proxyBypassHosts and proxyOnlyHosts', () => {
    const bypassHosts = ['bypass.elastic.co'];
    const onlyHosts = ['only.elastic.co'];
    let validated: ActionsConfig;

    validated = configSchema.validate({});
    expect(validated.proxyBypassHosts).toEqual(undefined);
    expect(validated.proxyOnlyHosts).toEqual(undefined);

    validated = configSchema.validate({
      proxyBypassHosts: bypassHosts,
    });
    expect(validated.proxyBypassHosts).toEqual(bypassHosts);
    expect(validated.proxyOnlyHosts).toEqual(undefined);

    validated = configSchema.validate({
      proxyOnlyHosts: onlyHosts,
    });
    expect(validated.proxyBypassHosts).toEqual(undefined);
    expect(validated.proxyOnlyHosts).toEqual(onlyHosts);
  });

  test('validates proxyBypassHosts and proxyOnlyHosts used at the same time', () => {
    const bypassHosts = ['bypass.elastic.co'];
    const onlyHosts = ['only.elastic.co'];
    const config: Record<string, unknown> = {
      proxyBypassHosts: bypassHosts,
      proxyOnlyHosts: onlyHosts,
    };

    let validated: ActionsConfig;

    // the config schema validation validates with both set
    validated = configSchema.validate(config);
    expect(validated.proxyBypassHosts).toEqual(bypassHosts);
    expect(validated.proxyOnlyHosts).toEqual(onlyHosts);

    // getValidatedConfig will warn and set onlyHosts to undefined with both set
    validated = getValidatedConfig(mockLogger, validated);
    expect(validated.proxyBypassHosts).toEqual(bypassHosts);
    expect(validated.proxyOnlyHosts).toEqual(undefined);
    expect(mockLogger.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "The configurations xpack.actions.proxyBypassHosts and xpack.actions.proxyOnlyHosts can not be used at the same time. The configuration xpack.actions.proxyOnlyHosts will be ignored.",
        ],
      ]
    `);
  });

  test('validates proxyUrl', () => {
    const proxyUrl = 'https://test.com';
    const badProxyUrl = 'bad url';
    let validated: ActionsConfig;

    validated = configSchema.validate({ proxyUrl });
    expect(validated.proxyUrl).toEqual(proxyUrl);
    expect(getValidatedConfig(mockLogger, validated).proxyUrl).toEqual(proxyUrl);
    expect(mockLogger.warn.mock.calls).toMatchInlineSnapshot(`Array []`);

    validated = configSchema.validate({ proxyUrl: badProxyUrl });
    expect(validated.proxyUrl).toEqual(badProxyUrl);
    expect(getValidatedConfig(mockLogger, validated).proxyUrl).toEqual(badProxyUrl);
    expect(mockLogger.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "The configuration xpack.actions.proxyUrl: bad url is invalid.",
        ],
      ]
    `);
  });

  // Most of the customHostSettings tests are in ./lib/custom_host_settings.test.ts
  // but this one seemed more relevant for this test suite, since url is the one
  // required property.
  test('validates customHostSettings contains a URL', () => {
    const config: Record<string, unknown> = {
      customHostSettings: [{}],
    };

    expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
      `"[customHostSettings.0.url]: expected value of type [string] but got [undefined]"`
    );
  });

  test('action with ssl configuration', () => {
    const config: Record<string, unknown> = {
      ssl: {
        verificationMode: 'none',
        proxyVerificationMode: 'none',
      },
    };
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "allowedHosts": Array [
          "*",
        ],
        "enableFooterInEmail": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "maxResponseContentLength": ByteSizeValue {
          "valueInBytes": 1048576,
        },
        "microsoftExchangeUrl": "https://login.microsoftonline.com",
        "microsoftGraphApiScope": "https://graph.microsoft.com/.default",
        "microsoftGraphApiUrl": "https://graph.microsoft.com/v1.0",
        "preconfigured": Object {},
        "preconfiguredAlertHistoryEsIndex": false,
        "responseTimeout": "PT1M",
        "ssl": Object {
          "proxyVerificationMode": "none",
          "verificationMode": "none",
        },
      }
    `);
  });

  test('validates email.domain_allowlist', () => {
    const config: Record<string, unknown> = {};
    let result = configSchema.validate(config);
    expect(result.email === undefined);

    config.email = {};
    expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
      `"[email]: email.domain_allowlist or email.services must be defined"`
    );

    config.email = { domain_allowlist: [] };
    result = configSchema.validate(config);
    expect(result.email?.domain_allowlist).toEqual([]);

    config.email = { domain_allowlist: ['a.com', 'b.c.com', 'd.e.f.com'] };
    result = configSchema.validate(config);
    expect(result.email?.domain_allowlist).toEqual(['a.com', 'b.c.com', 'd.e.f.com']);
  });

  test('validates rate limiter connector name', () => {
    let config: Record<string, unknown> = {
      rateLimiter: { slack: { limit: 10, lookbackWindow: '1m' } },
    };

    expect(() => configSchema.validate(config)).toThrow(
      'Rate limiter configuration for connector type "slack" is not supported. Supported types: email'
    );

    config = {
      rateLimiter: { email: { limit: 10, lookbackWindow: '1m' } },
    };

    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "allowedHosts": Array [
          "*",
        ],
        "enableFooterInEmail": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "maxResponseContentLength": ByteSizeValue {
          "valueInBytes": 1048576,
        },
        "microsoftExchangeUrl": "https://login.microsoftonline.com",
        "microsoftGraphApiScope": "https://graph.microsoft.com/.default",
        "microsoftGraphApiUrl": "https://graph.microsoft.com/v1.0",
        "preconfigured": Object {},
        "preconfiguredAlertHistoryEsIndex": false,
        "rateLimiter": Object {
          "email": Object {
            "limit": 10,
            "lookbackWindow": "1m",
          },
        },
        "responseTimeout": "PT1M",
      }
    `);
  });

  test('validates xpack.actions.webhook', () => {
    const config: Record<string, unknown> = {};
    let result = configSchema.validate(config);
    expect(result.webhook === undefined);

    config.webhook = {};
    result = configSchema.validate(config);
    expect(result.webhook?.ssl.pfx.enabled).toEqual(true);

    config.webhook = { ssl: {} };
    result = configSchema.validate(config);
    expect(result.webhook?.ssl.pfx.enabled).toEqual(true);

    config.webhook = { ssl: { pfx: {} } };
    result = configSchema.validate(config);
    expect(result.webhook?.ssl.pfx.enabled).toEqual(true);

    config.webhook = { ssl: { pfx: { enabled: false } } };
    result = configSchema.validate(config);
    expect(result.webhook?.ssl.pfx.enabled).toEqual(false);

    config.webhook = { ssl: { pfx: { enabled: true } } };
    result = configSchema.validate(config);
    expect(result.webhook?.ssl.pfx.enabled).toEqual(true);
  });

  describe('email.services.ses', () => {
    const config: Record<string, unknown> = {};
    test('validates no email config at all', () => {
      expect(configSchema.validate(config).email).toBe(undefined);
    });

    test('validates empty email config', () => {
      config.email = {};
      expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
        `"[email]: email.domain_allowlist or email.services must be defined"`
      );
    });

    test('validates email config with empty services', () => {
      config.email = { services: {} };
      expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
        `"[email.services]: email.services.enabled or email.services.ses must be defined"`
      );
    });

    test('validates email config with empty ses service', () => {
      config.email = { services: { ses: {} } };
      expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
        `"[email.services.ses.host]: expected value of type [string] but got [undefined]"`
      );
    });

    test('validates ses config with host only', () => {
      config.email = { services: { ses: { host: 'ses.host.com' } } };
      expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
        `"[email.services.ses.port]: expected value of type [number] but got [undefined]"`
      );
    });

    test('validates ses config with port only', () => {
      config.email = { services: { ses: { port: 1 } } };
      expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
        `"[email.services.ses.host]: expected value of type [string] but got [undefined]"`
      );
    });

    test('validates ses service', () => {
      config.email = { services: { ses: { host: 'ses.host.com', port: 1 } } };
      const result = configSchema.validate(config);
      expect(result.email?.services?.ses).toEqual({ host: 'ses.host.com', port: 1 });
    });
  });

  describe('email.services.enabled', () => {
    const config: Record<string, unknown> = {};
    test('validates email config with empty enabled services', () => {
      config.email = { services: { enabled: [] } };
      expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
        `"[email.services.enabled]: array size is [0], but cannot be smaller than [1]"`
      );
    });

    test('validates email config with enabled services', () => {
      config.email = { services: { enabled: ['elastic-cloud', 'amazon-ses'] } };
      const result = configSchema.validate(config);
      expect(result.email?.services?.enabled).toEqual(['elastic-cloud', 'amazon-ses']);
    });

    test('validates email config with unexistend service', () => {
      config.email = { services: { enabled: ['fake-service'] } };
      expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(`
        "[email.services.enabled.0]: types that failed validation:
        - [email.services.enabled.0.0]: expected value to equal [google-mail]
        - [email.services.enabled.0.1]: expected value to equal [microsoft-exchange]
        - [email.services.enabled.0.2]: expected value to equal [microsoft-outlook]
        - [email.services.enabled.0.3]: expected value to equal [amazon-ses]
        - [email.services.enabled.0.4]: expected value to equal [elastic-cloud]
        - [email.services.enabled.0.5]: expected value to equal [other]
        - [email.services.enabled.0.6]: expected value to equal [*]"
      `);
    });

    test('validates enabled services but no ses service', () => {
      config.email = { services: { enabled: ['google-mail', 'amazon-ses'] } };
      const result = configSchema.validate(config);
      expect(result.email?.services?.enabled).toEqual(['google-mail', 'amazon-ses']);
      expect(result.email?.services?.ses).toBeUndefined();
    });
  });
});

// object creator that ensures we can create a property named __proto__ on an
// object, via JSON.parse()
function preConfiguredActionConfig(id: string) {
  return JSON.parse(`{
    "preconfigured": {
        ${JSON.stringify(id)}: {
            "actionTypeId": ".server-log",
            "name": "server log 1"
        },
        "serverLog": {
            "actionTypeId": ".server-log",
            "name": "server log 2"
        }
    }
  }`);
}
