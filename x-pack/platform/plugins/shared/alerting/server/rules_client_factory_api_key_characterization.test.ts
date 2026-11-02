/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import {
  savedObjectsServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
  securityServiceMock,
  analyticsServiceMock,
} from '@kbn/core/server/mocks';
import type { SecurityStartMock } from '@kbn/core-security-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import type { RulesClientCreateOptions } from './rules_client_factory';
import { RulesClientFactory } from './rules_client_factory';
import { RulesClient } from './rules_client';
import type { CreateAPIKeyResult, RulesClientContext } from './rules_client/types';
import { createNewAPIKeySet } from './rules_client/lib/create_new_api_key_set';
import { resolveRuleAPIKey } from './rules_client/common/resolve_rule_api_key';
import type { RuleApiKeyOwnership } from './rules_client/common/resolve_rule_api_key';
import { ApiKeyType } from './task_runner/types';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { alertingAuthorizationClientFactoryMock } from './alerting_authorization_client_factory.mock';
import type { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { backfillClientMock } from './backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from './connector_adapters/connector_adapter_registry';
import { UIAM_LOGS_CREDENTIALS_TAGS, UIAM_LOGS_GRANT_TAGS } from './constants';
import { ALERTING_CLONE_API_KEY_HEADER } from '../common';
import { bulkMarkApiKeysForInvalidation } from './invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';

jest.mock('./rules_client');
jest.mock('./authorization/alerting_authorization');
jest.mock('./invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation');

const b64 = (value: string) => Buffer.from(value).toString('base64');

const METADATA = { managed: true, kibana: { type: 'alerting_rule' } };
const UIAM_GRANTED = {
  id: 'granted-uiam-id',
  name: 'uiam-granted',
  api_key: 'essu_granted_secret',
};
const ES_GRANTED = { id: 'granted-es-id', name: 'es-granted', api_key: 'granted-es-secret' };
const ES_CLONED = {
  id: 'cloned-es-id',
  name: 'es-cloned',
  api_key: 'cloned-es-secret',
  encoded: b64('cloned-es-id:cloned-es-secret'),
};
const { encoded: _encoded, ...ES_CLONED_RESULT } = ES_CLONED;

const CONFIGS = {
  esOnly: { shouldGrantUiam: false, apiKeyType: ApiKeyType.ES, uiamPresent: false },
  uiamTypeWithoutUiam: { shouldGrantUiam: false, apiKeyType: ApiKeyType.UIAM, uiamPresent: false },
  uiamGrantEsRun: { shouldGrantUiam: true, apiKeyType: ApiKeyType.ES, uiamPresent: true },
  uiamGrantUiamRun: { shouldGrantUiam: true, apiKeyType: ApiKeyType.UIAM, uiamPresent: true },
} as const;
type ConfigName = keyof typeof CONFIGS;

const realmUser = securityServiceMock.createMockAuthenticatedUser({ authentication_type: 'realm' });
const apiKeyUser = (internal?: boolean): AuthenticatedUser =>
  securityServiceMock.createMockAuthenticatedUser({
    authentication_type: 'api_key',
    api_key: {
      id: 'authenticated-key-id',
      name: 'authenticated-key',
      managed_by: 'cloud',
      ...(internal === undefined ? {} : { internal }),
    },
  });

interface Credential {
  headers: Record<string, string>;
  user: (internal?: boolean) => AuthenticatedUser | null;
  serviceAccount?: boolean;
}

const CREDENTIALS = {
  session: { headers: {}, user: () => realmUser },
  basic: {
    headers: { authorization: `Basic ${b64('basic-user:basic-pass')}` },
    user: () => realmUser,
  },
  uiamBearer: {
    headers: { authorization: 'Bearer essu_access_token' },
    user: () => securityServiceMock.createMockAuthenticatedUser({ authentication_type: 'token' }),
  },
  esApiKey: {
    headers: { authorization: `ApiKey ${b64('es-user-key-id:es-user-key-secret')}` },
    user: apiKeyUser,
  },
  encodedUiamApiKey: {
    headers: { authorization: `ApiKey ${b64('uiam-user-key-id:essu_encoded_user_secret')}` },
    user: apiKeyUser,
  },
  rawUiamApiKey: { headers: { authorization: 'ApiKey essu_raw_user_secret' }, user: apiKeyUser },
  uiamServiceAccount: {
    headers: { authorization: 'Bearer essu_service_account_token' },
    user: () => null,
    serviceAccount: true,
  },
} satisfies Record<string, Credential>;
type CredentialName = keyof typeof CREDENTIALS;

let securityService: SecurityStartMock;
let logger: ReturnType<typeof loggingSystemMock.createLogger>;
let uiamApiKeys: { grant: jest.Mock; invalidate: jest.Mock };

interface SetupOptions {
  config: ConfigName;
  credential?: CredentialName;
  headers?: Record<string, string>;
  internal?: boolean;
  uiamPresent?: boolean;
  withSecurityPluginStart?: boolean;
  createOptions?: RulesClientCreateOptions;
  withSpaceId?: boolean;
}

const setup = async ({
  config,
  credential = 'session',
  headers,
  internal,
  uiamPresent,
  withSecurityPluginStart = true,
  createOptions,
  withSpaceId = false,
}: SetupOptions) => {
  const { shouldGrantUiam, apiKeyType, uiamPresent: configUiamPresent } = CONFIGS[config];
  const {
    headers: credentialHeaders,
    user,
    serviceAccount,
  } = CREDENTIALS[credential] as Credential;

  securityService.authc.apiKeys.uiam =
    uiamPresent ?? configUiamPresent ? (uiamApiKeys as never) : null;
  securityService.authc.getCurrentUser.mockReturnValue(user(internal));
  if (serviceAccount) {
    securityService.authc.getPrincipal.mockReturnValue({
      type: 'service_account',
      serviceAccountId: 'sa-id',
      variant: 'uiam',
    });
  }

  const factory = new RulesClientFactory();
  factory.initialize({
    logger,
    taskManager: taskManagerMock.createStart(),
    ruleTypeRegistry: ruleTypeRegistryMock.create(),
    getSpaceId: jest.fn().mockReturnValue(asSpaceId('default')),
    spaceIdToNamespace: jest.fn().mockReturnValue('default'),
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    internalSavedObjectsRepository: savedObjectsRepositoryMock.create(),
    encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
    actions: actionsMock.createStart(),
    eventLog: eventLogMock.createStart(),
    kibanaVersion: '7.10.0',
    authorization:
      alertingAuthorizationClientFactoryMock.createFactory() as unknown as AlertingAuthorizationClientFactory,
    backfillClient: backfillClientMock.create(),
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    getAlertIndicesAlias: jest.fn(),
    alertsService: null,
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    isServerless: shouldGrantUiam,
    securityPluginSetup: securityMock.createSetup(),
    securityPluginStart: withSecurityPluginStart ? securityMock.createStart() : undefined,
    securityService,
    shouldGrantUiam,
    apiKeyType,
  });

  const request = mockRouter.createKibanaRequest({ headers: headers ?? credentialHeaders });
  const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();
  if (withSpaceId) {
    await factory.createWithSpaceId(
      request,
      savedObjectsService,
      asSpaceId('other-space'),
      createOptions
    );
  } else {
    await factory.create(request, savedObjectsService, createOptions);
  }

  const [[constructorOptions]] = jest.mocked(RulesClient).mock.calls;
  // Mirrors the RulesClient constructor, which spreads its options into the context.
  const context: RulesClientContext = { ...constructorOptions, minimumScheduleIntervalInMs: 60000 };
  return { context, request };
};

const captureError = async (fn: () => unknown): Promise<unknown> => {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
};

const expectError = (
  error: unknown,
  { message, boomStatus }: { message: string; boomStatus?: number }
) => {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(message);
  expect(Boom.isBoom(error) ? error.output.statusCode : undefined).toBe(boomStatus);
};

const uiamGrantFailureLog = (message: string, stackTrace: unknown) => [
  `Failed to create UIAM API key "uiam-test": ${message}`,
  { tags: UIAM_LOGS_GRANT_TAGS, error: { stack_trace: stackTrace } },
];
const CLOUD_KEY_NULL_MESSAGE = 'Failed to create a Cloud API key "uiam-test"';
const UIAM_NOT_ENABLED_MESSAGE = 'Failed to create UIAM API key "uiam-test": UIAM is not enabled';
const CLOUD_KEY_NOT_SUPPORTED_MESSAGE =
  'Cloud API keys are only supported in serverless environments; use a project-scoped Elasticsearch API key instead.';
const NOT_UIAM_COMPATIBLE_LOG = [
  'Request credential is not UIAM-compatible, skipping UIAM API key grant. Only ES API keys will be used.',
  { tags: UIAM_LOGS_CREDENTIALS_TAGS },
];
const QUEUED_GRANTED_UIAM = [
  { apiKeys: [b64('granted-uiam-id:essu_granted_secret')] },
  expect.anything(),
  expect.anything(),
];

beforeEach(() => {
  jest.clearAllMocks();
  securityService = securityServiceMock.createStart();
  logger = loggingSystemMock.createLogger();
  uiamApiKeys = { grant: jest.fn(), invalidate: jest.fn() };
});

describe('RulesClientFactory API key characterization', () => {
  describe('createAPIKey() credential x config matrix (all security calls succeed)', () => {
    type Outcome = 'esOnly' | 'esAndUiam' | 'uiamOnly' | 'uiamNotEnabled';
    const EXPECTED_RESULTS: Record<Exclude<Outcome, 'uiamNotEnabled'>, CreateAPIKeyResult> = {
      esOnly: { apiKeysEnabled: true, result: ES_GRANTED },
      esAndUiam: { apiKeysEnabled: true, result: ES_GRANTED, uiamResult: UIAM_GRANTED },
      uiamOnly: { apiKeysEnabled: true, uiamResult: UIAM_GRANTED },
    };

    const table: Array<[CredentialName, ConfigName, Outcome, boolean]> = [
      ['session', 'esOnly', 'esOnly', false],
      ['basic', 'esOnly', 'esOnly', false],
      ['uiamBearer', 'esOnly', 'esOnly', false],
      ['esApiKey', 'esOnly', 'esOnly', false],
      ['encodedUiamApiKey', 'esOnly', 'esOnly', false],
      ['rawUiamApiKey', 'esOnly', 'esOnly', false],
      ['uiamServiceAccount', 'esOnly', 'uiamNotEnabled', false],
      ['session', 'uiamTypeWithoutUiam', 'esOnly', false],
      ['basic', 'uiamTypeWithoutUiam', 'esOnly', false],
      ['uiamBearer', 'uiamTypeWithoutUiam', 'esOnly', false],
      ['esApiKey', 'uiamTypeWithoutUiam', 'esOnly', false],
      ['encodedUiamApiKey', 'uiamTypeWithoutUiam', 'esOnly', false],
      ['rawUiamApiKey', 'uiamTypeWithoutUiam', 'esOnly', false],
      ['uiamServiceAccount', 'uiamTypeWithoutUiam', 'uiamNotEnabled', false],
      ['session', 'uiamGrantEsRun', 'esOnly', true],
      ['basic', 'uiamGrantEsRun', 'esOnly', true],
      ['uiamBearer', 'uiamGrantEsRun', 'esAndUiam', false],
      ['esApiKey', 'uiamGrantEsRun', 'esOnly', true],
      ['encodedUiamApiKey', 'uiamGrantEsRun', 'esAndUiam', false],
      ['rawUiamApiKey', 'uiamGrantEsRun', 'esAndUiam', false],
      ['uiamServiceAccount', 'uiamGrantEsRun', 'uiamOnly', false],
      ['session', 'uiamGrantUiamRun', 'esOnly', true],
      ['basic', 'uiamGrantUiamRun', 'esOnly', true],
      ['uiamBearer', 'uiamGrantUiamRun', 'esAndUiam', false],
      ['esApiKey', 'uiamGrantUiamRun', 'esOnly', true],
      ['encodedUiamApiKey', 'uiamGrantUiamRun', 'esAndUiam', false],
      ['rawUiamApiKey', 'uiamGrantUiamRun', 'esAndUiam', false],
      ['uiamServiceAccount', 'uiamGrantUiamRun', 'uiamOnly', false],
    ];

    it.each(table)(
      '%s / %s -> %s (logs non-UIAM credentials: %s)',
      async (credential, config, outcome, logsNonUiamCredentials) => {
        const { context, request } = await setup({ config, credential });
        uiamApiKeys.grant.mockResolvedValue(UIAM_GRANTED);
        securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue(ES_GRANTED);

        if (outcome === 'uiamNotEnabled') {
          expectError(await captureError(() => context.createAPIKey('test', 'wait_for')), {
            message: UIAM_NOT_ENABLED_MESSAGE,
          });
        } else {
          expect(await context.createAPIKey('test', 'wait_for')).toEqual(EXPECTED_RESULTS[outcome]);
        }

        const grantsUiam = outcome === 'esAndUiam' || outcome === 'uiamOnly';
        const grantsEs = outcome === 'esOnly' || outcome === 'esAndUiam';
        expect(securityService.authc.getPrincipal.mock.calls).toEqual([[request]]);
        expect(uiamApiKeys.grant.mock.calls).toEqual(
          grantsUiam ? [[request, { name: 'uiam-test' }]] : []
        );
        expect(securityService.authc.apiKeys.grantAsInternalUser.mock.calls).toEqual(
          grantsEs
            ? [
                [
                  request,
                  { name: 'test', role_descriptors: {}, metadata: METADATA },
                  { refresh: 'wait_for' },
                ],
              ]
            : []
        );
        expect(uiamApiKeys.invalidate).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.debug.mock.calls).toEqual(
          logsNonUiamCredentials ? [NOT_UIAM_COMPATIBLE_LOG] : []
        );
      }
    );

    test('grants the UIAM key before the ES key', async () => {
      const { context } = await setup({ config: 'uiamGrantEsRun', credential: 'rawUiamApiKey' });
      uiamApiKeys.grant.mockResolvedValue(UIAM_GRANTED);
      securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue(ES_GRANTED);

      await context.createAPIKey('test');

      expect(uiamApiKeys.grant.mock.invocationCallOrder[0]).toBeLessThan(
        securityService.authc.apiKeys.grantAsInternalUser.mock.invocationCallOrder[0]
      );
      expect(securityService.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {}
      );
    });

    test.each(['session', 'uiamServiceAccount'] as const)(
      'returns { apiKeysEnabled: false } without any security call when securityPluginStart is missing: %s (current behavior)',
      async (credential) => {
        const { context } = await setup({
          config: 'uiamGrantUiamRun',
          credential,
          withSecurityPluginStart: false,
        });

        expect(await context.createAPIKey('test')).toEqual({ apiKeysEnabled: false });
        expect(securityService.authc.getPrincipal).not.toHaveBeenCalled();
        expect(uiamApiKeys.grant).not.toHaveBeenCalled();
        expect(securityService.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
      }
    );
  });

  describe('createAPIKey() failure injection and queued cleanup of minted keys', () => {
    type UiamOutcome = 'granted' | 'null' | 'throws' | 'serviceMissing';
    type EsOutcome = 'granted' | 'null' | 'throws';
    interface Row {
      credential: CredentialName;
      config: ConfigName;
      uiam: UiamOutcome;
      es: EsOutcome;
      result?: CreateAPIKeyResult;
      rejects?: 'esError' | 'uiamError' | 'cloudKeyNull' | 'uiamNotEnabled';
      esCalled: boolean;
      queues: boolean;
    }

    const BOTH: CreateAPIKeyResult = {
      apiKeysEnabled: true,
      result: ES_GRANTED,
      uiamResult: UIAM_GRANTED,
    };
    const ES_ONLY: CreateAPIKeyResult = { apiKeysEnabled: true, result: ES_GRANTED };
    const UIAM_ONLY: CreateAPIKeyResult = { apiKeysEnabled: true, uiamResult: UIAM_GRANTED };
    const DISABLED: CreateAPIKeyResult = { apiKeysEnabled: false };

    const softRows = (config: ConfigName): Row[] => [
      {
        credential: 'rawUiamApiKey',
        config,
        uiam: 'granted',
        es: 'granted',
        result: BOTH,
        esCalled: true,
        queues: false,
      },
      {
        credential: 'rawUiamApiKey',
        config,
        uiam: 'granted',
        es: 'null',
        result: DISABLED,
        esCalled: true,
        queues: true,
      },
      {
        credential: 'rawUiamApiKey',
        config,
        uiam: 'granted',
        es: 'throws',
        rejects: 'esError',
        esCalled: true,
        queues: true,
      },
    ];

    const table: Row[] = [
      ...softRows('uiamGrantEsRun'),
      ...(['null', 'throws', 'serviceMissing'] as const).flatMap((uiam): Row[] => [
        {
          credential: 'rawUiamApiKey',
          config: 'uiamGrantEsRun',
          uiam,
          es: 'granted',
          result: ES_ONLY,
          esCalled: true,
          queues: false,
        },
        {
          credential: 'rawUiamApiKey',
          config: 'uiamGrantEsRun',
          uiam,
          es: 'null',
          result: DISABLED,
          esCalled: true,
          queues: false,
        },
        {
          credential: 'rawUiamApiKey',
          config: 'uiamGrantEsRun',
          uiam,
          es: 'throws',
          rejects: 'esError',
          esCalled: true,
          queues: false,
        },
      ]),
      ...softRows('uiamGrantUiamRun'),
      ...(['granted', 'null', 'throws'] as const).flatMap((es): Row[] => [
        {
          credential: 'rawUiamApiKey',
          config: 'uiamGrantUiamRun',
          uiam: 'null',
          es,
          rejects: 'cloudKeyNull',
          esCalled: false,
          queues: false,
        },
        {
          credential: 'rawUiamApiKey',
          config: 'uiamGrantUiamRun',
          uiam: 'throws',
          es,
          rejects: 'uiamError',
          esCalled: false,
          queues: false,
        },
        {
          credential: 'rawUiamApiKey',
          config: 'uiamGrantUiamRun',
          uiam: 'serviceMissing',
          es,
          rejects: 'uiamNotEnabled',
          esCalled: false,
          queues: false,
        },
      ]),
      ...(['uiamGrantEsRun', 'uiamGrantUiamRun'] as const).flatMap((config): Row[] => [
        {
          credential: 'uiamServiceAccount',
          config,
          uiam: 'granted',
          es: 'granted',
          result: UIAM_ONLY,
          esCalled: false,
          queues: false,
        },
        {
          credential: 'uiamServiceAccount',
          config,
          uiam: 'null',
          es: 'granted',
          rejects: 'cloudKeyNull',
          esCalled: false,
          queues: false,
        },
        {
          credential: 'uiamServiceAccount',
          config,
          uiam: 'throws',
          es: 'granted',
          rejects: 'uiamError',
          esCalled: false,
          queues: false,
        },
        {
          credential: 'uiamServiceAccount',
          config,
          uiam: 'serviceMissing',
          es: 'granted',
          rejects: 'uiamNotEnabled',
          esCalled: false,
          queues: false,
        },
      ]),
    ];

    it.each(table)(
      '$credential / $config: uiam.grant $uiam, grantAsInternalUser $es',
      async ({ credential, config, uiam, es, result, rejects, esCalled, queues }) => {
        const uiamError = new Error('UIAM grant failed');
        const esError = new Error('ES grant failed');
        const { context, request } = await setup({
          config,
          credential,
          uiamPresent: uiam !== 'serviceMissing',
        });
        if (uiam === 'granted') uiamApiKeys.grant.mockResolvedValue(UIAM_GRANTED);
        if (uiam === 'null') uiamApiKeys.grant.mockResolvedValue(null);
        if (uiam === 'throws') uiamApiKeys.grant.mockRejectedValue(uiamError);
        const { grantAsInternalUser } = securityService.authc.apiKeys;
        if (es === 'granted') grantAsInternalUser.mockResolvedValue(ES_GRANTED);
        if (es === 'null') grantAsInternalUser.mockResolvedValue(null);
        if (es === 'throws') grantAsInternalUser.mockRejectedValue(esError);

        const outcome = context.createAPIKey('test');
        if (rejects === 'esError') await expect(outcome).rejects.toBe(esError);
        if (rejects === 'uiamError') await expect(outcome).rejects.toBe(uiamError);
        if (rejects === 'cloudKeyNull') {
          expectError(await captureError(() => outcome), { message: CLOUD_KEY_NULL_MESSAGE });
        }
        if (rejects === 'uiamNotEnabled') {
          expectError(await captureError(() => outcome), { message: UIAM_NOT_ENABLED_MESSAGE });
        }
        if (result) expect(await outcome).toEqual(result);

        expect(uiamApiKeys.grant.mock.calls).toEqual(
          uiam === 'serviceMissing' ? [] : [[request, { name: 'uiam-test' }]]
        );
        expect(grantAsInternalUser.mock.calls.length).toBe(esCalled ? 1 : 0);
        expect(uiamApiKeys.invalidate).not.toHaveBeenCalled();
        expect(jest.mocked(bulkMarkApiKeysForInvalidation).mock.calls).toEqual(
          queues ? [QUEUED_GRANTED_UIAM] : []
        );
        expect(logger.error.mock.calls).toEqual(
          uiam === 'granted' || uiam === 'serviceMissing'
            ? []
            : [
                uiam === 'throws'
                  ? uiamGrantFailureLog('UIAM grant failed', uiamError.stack)
                  : uiamGrantFailureLog(CLOUD_KEY_NULL_MESSAGE, expect.any(String)),
              ]
        );
      }
    );

    test('a non-Error UIAM rejection is logged with its string value and no stack', async () => {
      const { context } = await setup({ config: 'uiamGrantEsRun', credential: 'rawUiamApiKey' });
      uiamApiKeys.grant.mockRejectedValue('plain string failure');
      securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue(ES_GRANTED);

      expect(await context.createAPIKey('test')).toEqual(ES_ONLY);
      expect(logger.error.mock.calls).toEqual([
        uiamGrantFailureLog('plain string failure', undefined),
      ]);
    });
  });

  describe('getAuthenticationAPIKey() matrix', () => {
    type Expectation =
      | { value: CreateAPIKeyResult }
      | { error: { message: string; boomStatus?: number } };
    interface Row {
      label: string;
      header?: string;
      shouldGrantUiam: boolean;
      readsCurrentUser: boolean;
      whenExternal: Expectation;
      otherwise: Expectation;
    }

    const same = (expectation: Expectation) => ({
      whenExternal: expectation,
      otherwise: expectation,
    });
    const NO_KEY_ERROR = {
      error: {
        message: 'Could not extract an API key from the request authorization header.',
        boomStatus: 400,
      },
    };
    const PARSE_ERROR = {
      error: {
        message: 'Failed to parse API key credentials from the request authorization header.',
        boomStatus: 400,
      },
    };
    const CLOUD_KEY_BOOM = {
      error: { message: CLOUD_KEY_NOT_SUPPORTED_MESSAGE, boomStatus: 400 },
    };
    const rawUiam = (apiKey: string) => ({
      whenExternal: {
        value: {
          apiKeysEnabled: true,
          uiamResult: { name: 'uiam-test', api_key: apiKey, external: true },
        },
      },
      otherwise: {
        value: { apiKeysEnabled: true, uiamResult: { name: 'uiam-test', api_key: apiKey } },
      },
    });
    const esResult = (id: string, apiKey: string) =>
      same({ value: { apiKeysEnabled: true, result: { name: 'test', id, api_key: apiKey } } });

    const table: Row[] = [false, true].flatMap((shouldGrantUiam): Row[] => [
      {
        label: 'no authorization header',
        shouldGrantUiam,
        readsCurrentUser: false,
        ...same({ value: { apiKeysEnabled: false } }),
      },
      {
        label: 'scheme without credentials',
        header: 'ApiKey',
        shouldGrantUiam,
        readsCurrentUser: false,
        ...same({ value: { apiKeysEnabled: false } }),
      },
      {
        label: 'Basic credentials are not an API key',
        header: CREDENTIALS.basic.headers.authorization,
        shouldGrantUiam,
        readsCurrentUser: false,
        ...same({ value: { apiKeysEnabled: false } }),
      },
      {
        label: 'ES API key',
        header: CREDENTIALS.esApiKey.headers.authorization,
        shouldGrantUiam,
        readsCurrentUser: false,
        ...esResult('es-user-key-id', 'es-user-key-secret'),
      },
      {
        label: 'ES API key with extra colon segments',
        header: `ApiKey ${b64('key-id:secret:extra')}`,
        shouldGrantUiam,
        readsCurrentUser: false,
        ...esResult('key-id', 'secret:extra'),
      },
      {
        label: 'non-base64 credentials',
        header: 'ApiKey a-broken-api-key',
        shouldGrantUiam,
        readsCurrentUser: false,
        ...same(NO_KEY_ERROR),
      },
      {
        label: 'empty id',
        header: `ApiKey ${b64(':secret')}`,
        shouldGrantUiam,
        readsCurrentUser: false,
        ...same(PARSE_ERROR),
      },
      {
        label: 'empty secret',
        header: `ApiKey ${b64('key-id:')}`,
        shouldGrantUiam,
        readsCurrentUser: false,
        ...same(NO_KEY_ERROR),
      },
      shouldGrantUiam
        ? {
            label: 'base64(id:essu_) UIAM API key',
            header: CREDENTIALS.encodedUiamApiKey.headers.authorization,
            shouldGrantUiam,
            readsCurrentUser: true,
            whenExternal: {
              value: {
                apiKeysEnabled: true,
                uiamResult: {
                  name: 'uiam-test',
                  id: 'uiam-user-key-id',
                  api_key: 'essu_encoded_user_secret',
                  external: true,
                },
              },
            },
            otherwise: {
              value: {
                apiKeysEnabled: true,
                uiamResult: {
                  name: 'uiam-test',
                  id: 'uiam-user-key-id',
                  api_key: 'essu_encoded_user_secret',
                },
              },
            },
          }
        : {
            label: 'base64(id:essu_) UIAM API key',
            header: CREDENTIALS.encodedUiamApiKey.headers.authorization,
            shouldGrantUiam,
            readsCurrentUser: false,
            ...same(CLOUD_KEY_BOOM),
          },
      {
        label: 'raw essu_ API key',
        header: 'ApiKey essu_raw_user_secret',
        shouldGrantUiam,
        readsCurrentUser: shouldGrantUiam,
        ...(shouldGrantUiam ? rawUiam('essu_raw_user_secret') : same(CLOUD_KEY_BOOM)),
      },
      {
        label: 'Bearer essu_ token is not an API key',
        header: 'Bearer essu_access_token',
        shouldGrantUiam,
        readsCurrentUser: false,
        ...same({ value: { apiKeysEnabled: false } }),
      },
      {
        label: 'lowercase apikey scheme with raw essu_',
        header: 'apikey essu_lower',
        shouldGrantUiam,
        readsCurrentUser: shouldGrantUiam,
        ...(shouldGrantUiam ? rawUiam('essu_lower') : same(CLOUD_KEY_BOOM)),
      },
    ]);

    const USER_CASES: Array<[string, AuthenticatedUser | null, boolean]> = [
      ['api_key.internal === false', apiKeyUser(false), true],
      ['api_key.internal === true', apiKeyUser(true), false],
      ['api_key.internal absent', apiKeyUser(), false],
      ['user without api_key', realmUser, false],
      ['no current user', null, false],
    ];

    it.each(table)(
      '$label, shouldGrantUiam=$shouldGrantUiam',
      async ({ header, shouldGrantUiam, readsCurrentUser, whenExternal, otherwise }) => {
        for (const config of Object.keys(CONFIGS) as ConfigName[]) {
          if (CONFIGS[config].shouldGrantUiam !== shouldGrantUiam) continue;
          for (const [, user, external] of USER_CASES) {
            jest.mocked(RulesClient).mockClear();
            securityService = securityServiceMock.createStart();
            const { context, request } = await setup({
              config,
              headers: header === undefined ? {} : { authorization: header },
            });
            securityService.authc.getCurrentUser.mockReturnValue(user);
            const expected = external ? whenExternal : otherwise;

            if ('value' in expected) {
              expect(context.getAuthenticationAPIKey('test')).toEqual(expected.value);
            } else {
              expectError(
                await captureError(() => context.getAuthenticationAPIKey('test')),
                expected.error
              );
            }
            expect(securityService.authc.getCurrentUser.mock.calls).toEqual(
              readsCurrentUser ? [[request]] : []
            );
          }
        }
      }
    );

    test('does not consult securityPluginStart (current behavior)', async () => {
      const { context } = await setup({
        config: 'esOnly',
        credential: 'esApiKey',
        withSecurityPluginStart: false,
      });

      expect(context.getAuthenticationAPIKey('test')).toEqual({
        apiKeysEnabled: true,
        result: { name: 'test', id: 'es-user-key-id', api_key: 'es-user-key-secret' },
      });
    });

    test('reads shouldGrantUiam from the factory, whatever `this` it is invoked on', async () => {
      const { context } = await setup({ config: 'esOnly', credential: 'rawUiamApiKey' });
      const { getAuthenticationAPIKey } = context;

      for (const call of [
        () => getAuthenticationAPIKey.call({ shouldGrantUiam: true }, 'test'),
        () => getAuthenticationAPIKey('test'),
      ]) {
        expectError(await captureError(call), CLOUD_KEY_BOOM.error);
      }
    });
  });

  describe('cloneAPIKey() matrix', () => {
    type UiamOutcome = 'granted' | 'null' | 'throws' | 'serviceMissing';
    type CloneOutcome = 'cloned' | 'null' | 'throws';

    describe('requests carrying a UIAM credential mint a UIAM key', () => {
      interface Row {
        credential: CredentialName;
        config: ConfigName;
        uiam: UiamOutcome;
        rejects?: 'uiamNotEnabled' | 'cloudKeyNull' | 'uiamError';
        grantLog?: 'null' | 'throws';
      }
      const table: Row[] = (['rawUiamApiKey', 'encodedUiamApiKey', 'uiamBearer'] as const).flatMap(
        (credential): Row[] => [
          { credential, config: 'esOnly', uiam: 'granted', rejects: 'uiamNotEnabled' },
          { credential, config: 'uiamTypeWithoutUiam', uiam: 'granted', rejects: 'uiamNotEnabled' },
          ...(['uiamGrantEsRun', 'uiamGrantUiamRun'] as const).flatMap((config): Row[] => [
            { credential, config, uiam: 'granted' },
            { credential, config, uiam: 'null', rejects: 'cloudKeyNull', grantLog: 'null' },
            { credential, config, uiam: 'throws', rejects: 'uiamError', grantLog: 'throws' },
            { credential, config, uiam: 'serviceMissing', rejects: 'uiamNotEnabled' },
          ]),
        ]
      );
      table.push({
        credential: 'uiamServiceAccount',
        config: 'uiamGrantEsRun',
        uiam: 'null',
        rejects: 'cloudKeyNull',
        grantLog: 'null',
      });

      it.each(table)(
        '$credential / $config: uiam.grant $uiam',
        async ({ credential, config, uiam, rejects, grantLog }) => {
          const uiamError = new Error('UIAM grant failed');
          const { context, request } = await setup({
            config,
            credential,
            uiamPresent: CONFIGS[config].uiamPresent && uiam !== 'serviceMissing',
          });
          if (uiam === 'granted') uiamApiKeys.grant.mockResolvedValue(UIAM_GRANTED);
          if (uiam === 'null') uiamApiKeys.grant.mockResolvedValue(null);
          if (uiam === 'throws') uiamApiKeys.grant.mockRejectedValue(uiamError);

          const outcome = context.cloneAPIKey('test');
          if (rejects === 'uiamNotEnabled') {
            expectError(await captureError(() => outcome), { message: UIAM_NOT_ENABLED_MESSAGE });
          }
          if (rejects === 'cloudKeyNull') {
            expectError(await captureError(() => outcome), { message: CLOUD_KEY_NULL_MESSAGE });
          }
          if (rejects === 'uiamError') await expect(outcome).rejects.toBe(uiamError);
          if (!rejects) {
            expect(await outcome).toEqual({ apiKeysEnabled: true, uiamResult: UIAM_GRANTED });
          }

          const callsUiam = CONFIGS[config].shouldGrantUiam && uiam !== 'serviceMissing';
          expect(uiamApiKeys.grant.mock.calls).toEqual(
            callsUiam ? [[request, { name: 'uiam-test' }]] : []
          );
          expect(securityService.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
          expect(securityService.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
          expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
          expect(logger.error.mock.calls).toEqual(
            grantLog === undefined
              ? []
              : [
                  grantLog === 'throws'
                    ? uiamGrantFailureLog('UIAM grant failed', uiamError.stack)
                    : uiamGrantFailureLog(CLOUD_KEY_NULL_MESSAGE, expect.any(String)),
                ]
          );
        }
      );
    });

    describe('every other request is cloned through Elasticsearch', () => {
      const table: Array<[CredentialName, ConfigName, CloneOutcome]> = (
        ['session', 'basic', 'esApiKey'] as const
      ).flatMap((credential) =>
        (['esOnly', 'uiamGrantUiamRun'] as const).flatMap((config) =>
          (['cloned', 'null', 'throws'] as const).map(
            (clone): [CredentialName, ConfigName, CloneOutcome] => [credential, config, clone]
          )
        )
      );

      it.each(table)('%s / %s: cloneAsInternalUser %s', async (credential, config, clone) => {
        const cloneError = new Error('clone failed');
        const { context, request } = await setup({ config, credential });
        const { cloneAsInternalUser } = securityService.authc.apiKeys;
        if (clone === 'cloned') cloneAsInternalUser.mockResolvedValue(ES_CLONED);
        if (clone === 'null') cloneAsInternalUser.mockResolvedValue(null);
        if (clone === 'throws') cloneAsInternalUser.mockRejectedValue(cloneError);

        const outcome = context.cloneAPIKey('test');
        if (clone === 'cloned') {
          expect(await outcome).toEqual({ apiKeysEnabled: true, result: ES_CLONED_RESULT });
        }
        if (clone === 'null') {
          expectError(await captureError(() => outcome), {
            message: 'API key clone returned null (security feature may be disabled)',
          });
        }
        if (clone === 'throws') await expect(outcome).rejects.toBe(cloneError);

        expect(cloneAsInternalUser.mock.calls).toEqual([
          [request, { name: 'test', metadata: METADATA }],
        ]);
        expect(uiamApiKeys.grant).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
      });

      test('still calls cloneAsInternalUser when securityPluginStart is missing', async () => {
        const { context } = await setup({
          config: 'esOnly',
          credential: 'esApiKey',
          withSecurityPluginStart: false,
        });
        securityService.authc.apiKeys.cloneAsInternalUser.mockResolvedValue(ES_CLONED);

        expect(await context.cloneAPIKey('test')).toEqual({
          apiKeysEnabled: true,
          result: ES_CLONED_RESULT,
        });
      });
    });
  });

  describe('isAuthenticationTypeAPIKey() matrix', () => {
    // [label, expected, securityPluginStart present, current user, authorization header]
    const table: Array<[string, boolean, boolean, AuthenticatedUser | null, string | undefined]> = [
      ['no securityPluginStart', false, false, apiKeyUser(), 'ApiKey abc'],
      ['api_key user, no header', true, true, apiKeyUser(), undefined],
      ['api_key user, Bearer header', true, true, apiKeyUser(), 'Bearer abc'],
      ['realm user, ApiKey header (user wins)', false, true, realmUser, 'ApiKey abc'],
      [
        'empty authentication_type falls back to header',
        true,
        true,
        securityServiceMock.createMockAuthenticatedUser({ authentication_type: '' }),
        'ApiKey abc',
      ],
      ['no user, ApiKey header', true, true, null, 'ApiKey abc'],
      ['no user, lowercase apikey header', true, true, null, 'apikey abc'],
      ['no user, uppercase APIKEY header', true, true, null, 'APIKEY abc'],
      ['no user, ApiKey scheme without credentials', true, true, null, 'ApiKey'],
      ['no user, Bearer header', false, true, null, 'Bearer abc'],
      ['no user, no header', false, true, null, undefined],
    ];

    it.each(table)(
      '%s -> %s (current behavior)',
      async (_label, expected, withStart, user, header) => {
        const { context } = await setup({
          config: 'esOnly',
          headers: header === undefined ? {} : { authorization: header },
          withSecurityPluginStart: withStart,
        });
        securityService.authc.getCurrentUser.mockReturnValue(user);

        expect(context.isAuthenticationTypeAPIKey()).toBe(expected);
      }
    );
  });

  describe('cloneApiKeysOnCreate derivation', () => {
    const table: Array<[boolean | undefined, string | undefined, boolean]> = [
      [undefined, undefined, false],
      [undefined, 'true', true],
      [undefined, 'TRUE', false],
      [undefined, 'false', false],
      [undefined, '1', false],
      [true, undefined, true],
      [true, 'false', true],
      [false, 'true', false],
      [false, undefined, false],
    ];

    it.each(table)(
      'option %s, header %s -> %s for create() and createWithSpaceId() (current behavior)',
      async (option, header, expected) => {
        for (const withSpaceId of [false, true]) {
          jest.mocked(RulesClient).mockClear();
          const { context } = await setup({
            config: 'esOnly',
            headers: header === undefined ? {} : { [ALERTING_CLONE_API_KEY_HEADER]: header },
            createOptions: option === undefined ? undefined : { cloneApiKeysOnCreate: option },
            withSpaceId,
          });
          expect(context.cloneApiKeysOnCreate).toBe(expected);
        }
      }
    );
  });

  describe('resolveRuleAPIKey() decision order', () => {
    type Path = 'clone' | 'grant' | 'reuse';
    const OWNERSHIPS: Array<RuleApiKeyOwnership | undefined> = [
      undefined,
      { apiKeyCreatedByUser: null },
      { apiKeyCreatedByUser: true },
      { apiKeyCreatedByUser: false },
    ];
    const KEYS: Record<Path, CreateAPIKeyResult> = {
      clone: { apiKeysEnabled: true, result: ES_CLONED },
      grant: { apiKeysEnabled: true, result: ES_GRANTED },
      reuse: {
        apiKeysEnabled: true,
        result: { id: 'user-id', name: 'user', api_key: 'user-secret' },
      },
    };

    // [isApiKeyAuth, cloneApiKey option, cloneApiKeysOnCreate, expected path per OWNERSHIPS entry]
    const table: Array<[boolean, boolean, boolean, [Path, Path, Path, Path]]> = [
      [false, false, false, ['grant', 'grant', 'grant', 'grant']],
      [false, true, false, ['grant', 'grant', 'grant', 'grant']],
      [false, false, true, ['grant', 'grant', 'grant', 'grant']],
      [false, true, true, ['grant', 'grant', 'grant', 'grant']],
      [true, false, false, ['reuse', 'reuse', 'reuse', 'clone']],
      [true, true, false, ['clone', 'clone', 'clone', 'clone']],
      [true, false, true, ['clone', 'clone', 'clone', 'clone']],
      [true, true, true, ['clone', 'clone', 'clone', 'clone']],
    ];

    const createContext = (isApiKeyAuth: boolean, cloneApiKeysOnCreate: boolean) =>
      ({
        createAPIKey: jest.fn().mockResolvedValue(KEYS.grant),
        isAuthenticationTypeAPIKey: jest.fn().mockReturnValue(isApiKeyAuth),
        getAuthenticationAPIKey: jest.fn().mockReturnValue(KEYS.reuse),
        cloneAPIKey: jest.fn().mockResolvedValue(KEYS.clone),
        cloneApiKeysOnCreate,
      } as unknown as jest.Mocked<RulesClientContext>);

    it.each(table)(
      'isApiKeyAuth=%s cloneApiKey=%s cloneApiKeysOnCreate=%s -> %j for ownership [omitted, null, true, false] (current behavior)',
      async (isApiKeyAuth, cloneApiKey, cloneApiKeysOnCreate, paths) => {
        for (const [index, apiKeyOwnership] of OWNERSHIPS.entries()) {
          const path = paths[index];
          const context = createContext(isApiKeyAuth, cloneApiKeysOnCreate);

          expect(
            await resolveRuleAPIKey(context, 'rule', true, {
              apiKeyOwnership,
              cloneApiKey,
              refresh: 'wait_for',
            })
          ).toEqual({ createdAPIKey: KEYS[path], isAuthTypeApiKey: path === 'reuse' });
          expect(context.isAuthenticationTypeAPIKey).toHaveBeenCalledTimes(1);
          expect(context.cloneAPIKey.mock.calls).toEqual(path === 'clone' ? [['rule']] : []);
          expect(context.createAPIKey.mock.calls).toEqual(
            path === 'grant' ? [['rule', 'wait_for']] : []
          );
          expect(context.getAuthenticationAPIKey.mock.calls).toEqual(
            path === 'reuse' ? [['rule-user-created']] : []
          );
        }
      }
    );

    test('a disabled rule short-circuits before reading the request (current behavior)', async () => {
      const context = createContext(true, true);

      expect(
        await resolveRuleAPIKey(context, 'rule', false, {
          apiKeyOwnership: { apiKeyCreatedByUser: false },
          cloneApiKey: true,
        })
      ).toEqual({ createdAPIKey: null, isAuthTypeApiKey: false });
      expect(context.isAuthenticationTypeAPIKey).not.toHaveBeenCalled();
      expect(context.cloneAPIKey).not.toHaveBeenCalled();
      expect(context.createAPIKey).not.toHaveBeenCalled();
      expect(context.getAuthenticationAPIKey).not.toHaveBeenCalled();
    });

    test('rethrows getAuthenticationAPIKey errors unwrapped, keeping Boom status (current behavior)', async () => {
      const context = createContext(true, false);
      const boom = Boom.badRequest('nope');
      context.getAuthenticationAPIKey.mockImplementation(() => {
        throw boom;
      });

      await expect(resolveRuleAPIKey(context, 'rule', true)).rejects.toBe(boom);
    });
  });

  describe('createNewAPIKeySet() end to end through the real factory context', () => {
    const NAME = 'Alerting: 123/rule-name';
    const OWNER = { apiKeyOwner: 'test', apiKeyOwnerProfileUid: 'u_profile_test' };
    const GRANTED_ES = b64('granted-es-id:granted-es-secret');
    const GRANTED_UIAM = b64('granted-uiam-id:essu_granted_secret');
    const CLONED_ES = b64('cloned-es-id:cloned-es-secret');

    type Attributes = Awaited<ReturnType<typeof createNewAPIKeySet>>;
    interface Row {
      title: string;
      credential: CredentialName;
      config: ConfigName;
      internal?: boolean;
      apiKeyOwnership?: RuleApiKeyOwnership;
      cloneHeader?: boolean;
      expected: Attributes | { boom: string };
    }

    const grantedEsOnly: Attributes = { apiKey: GRANTED_ES, ...OWNER, apiKeyCreatedByUser: false };
    const grantedBoth: Attributes = {
      ...grantedEsOnly,
      uiamApiKey: GRANTED_UIAM,
      uiamApiKeyExternal: false,
    };
    const clonedEs: Attributes = { apiKey: CLONED_ES, ...OWNER, apiKeyCreatedByUser: false };
    const grantedUiamOnly: Attributes = {
      apiKey: null,
      ...OWNER,
      apiKeyCreatedByUser: false,
      uiamApiKey: GRANTED_UIAM,
      uiamApiKeyExternal: false,
    };
    const frameworkManaged = { apiKeyCreatedByUser: false };

    const table: Row[] = [
      { title: 'session', credential: 'session', config: 'esOnly', expected: grantedEsOnly },
      {
        title: 'session',
        credential: 'session',
        config: 'uiamGrantEsRun',
        expected: grantedEsOnly,
      },
      {
        title: 'session',
        credential: 'session',
        config: 'uiamGrantUiamRun',
        expected: grantedEsOnly,
      },
      {
        title: 'UIAM bearer token',
        credential: 'uiamBearer',
        config: 'esOnly',
        expected: grantedEsOnly,
      },
      {
        title: 'UIAM bearer token',
        credential: 'uiamBearer',
        config: 'uiamGrantEsRun',
        expected: grantedBoth,
      },
      {
        title: 'UIAM bearer token',
        credential: 'uiamBearer',
        config: 'uiamGrantUiamRun',
        expected: grantedBoth,
      },
      {
        title: 'user ES API key is reused',
        credential: 'esApiKey',
        config: 'esOnly',
        expected: {
          apiKey: b64('es-user-key-id:es-user-key-secret'),
          ...OWNER,
          apiKeyCreatedByUser: true,
        },
      },
      {
        title: 'user ES API key is reused without a UIAM key even when rules run on UIAM',
        credential: 'esApiKey',
        config: 'uiamGrantUiamRun',
        expected: {
          apiKey: b64('es-user-key-id:es-user-key-secret'),
          ...OWNER,
          apiKeyCreatedByUser: true,
        },
      },
      {
        title: 'user base64(id:essu_) key outside serverless',
        credential: 'encodedUiamApiKey',
        config: 'esOnly',
        internal: false,
        expected: {
          boom: `Error creating API key for rule - ${CLOUD_KEY_NOT_SUPPORTED_MESSAGE}`,
        },
      },
      {
        title: 'user base64(id:essu_) external key',
        credential: 'encodedUiamApiKey',
        config: 'uiamGrantEsRun',
        internal: false,
        expected: {
          apiKey: null,
          ...OWNER,
          apiKeyCreatedByUser: true,
          uiamApiKey: b64('uiam-user-key-id:essu_encoded_user_secret'),
          uiamApiKeyExternal: true,
        },
      },
      {
        title: 'user base64(id:essu_) key without internal verdict',
        credential: 'encodedUiamApiKey',
        config: 'uiamGrantUiamRun',
        expected: {
          apiKey: null,
          ...OWNER,
          apiKeyCreatedByUser: true,
          uiamApiKey: b64('uiam-user-key-id:essu_encoded_user_secret'),
          uiamApiKeyExternal: false,
        },
      },
      {
        title: 'user raw essu_ key outside serverless',
        credential: 'rawUiamApiKey',
        config: 'esOnly',
        internal: false,
        expected: {
          boom: `Error creating API key for rule - ${CLOUD_KEY_NOT_SUPPORTED_MESSAGE}`,
        },
      },
      {
        title: 'user raw essu_ external key stored as-is',
        credential: 'rawUiamApiKey',
        config: 'uiamGrantEsRun',
        internal: false,
        expected: {
          apiKey: null,
          ...OWNER,
          apiKeyCreatedByUser: true,
          uiamApiKey: 'essu_raw_user_secret',
          uiamApiKeyExternal: true,
        },
      },
      {
        title: 'user raw essu_ internal key stored as-is',
        credential: 'rawUiamApiKey',
        config: 'uiamGrantUiamRun',
        internal: true,
        expected: {
          apiKey: null,
          ...OWNER,
          apiKeyCreatedByUser: true,
          uiamApiKey: 'essu_raw_user_secret',
          uiamApiKeyExternal: false,
        },
      },
      {
        title: 'framework-managed ES key is cloned',
        credential: 'esApiKey',
        config: 'esOnly',
        apiKeyOwnership: frameworkManaged,
        expected: clonedEs,
      },
      {
        title: 'framework-managed ES key is cloned without a UIAM key',
        credential: 'esApiKey',
        config: 'uiamGrantUiamRun',
        apiKeyOwnership: frameworkManaged,
        expected: clonedEs,
      },
      {
        title: 'framework-managed base64(id:essu_) key mints a fresh UIAM key',
        credential: 'encodedUiamApiKey',
        config: 'uiamGrantUiamRun',
        apiKeyOwnership: frameworkManaged,
        expected: grantedUiamOnly,
      },
      {
        title: 'framework-managed raw essu_ key outside serverless',
        credential: 'rawUiamApiKey',
        config: 'esOnly',
        apiKeyOwnership: frameworkManaged,
        expected: {
          boom: `Error creating API key for rule - Failed to create UIAM API key "uiam-${NAME}": UIAM is not enabled`,
        },
      },
      {
        title: 'framework-managed raw essu_ external key mints an internal UIAM key',
        credential: 'rawUiamApiKey',
        config: 'uiamGrantEsRun',
        internal: false,
        apiKeyOwnership: frameworkManaged,
        expected: grantedUiamOnly,
      },
      {
        title: 'framework-managed session rule is granted',
        credential: 'session',
        config: 'uiamGrantUiamRun',
        apiKeyOwnership: frameworkManaged,
        expected: grantedEsOnly,
      },
      {
        title: 'clone header with an ES key',
        credential: 'esApiKey',
        config: 'esOnly',
        cloneHeader: true,
        expected: clonedEs,
      },
      {
        title: 'clone header with a raw essu_ key',
        credential: 'rawUiamApiKey',
        config: 'uiamGrantUiamRun',
        cloneHeader: true,
        expected: grantedUiamOnly,
      },
      {
        title: 'UIAM service account',
        credential: 'uiamServiceAccount',
        config: 'uiamGrantEsRun',
        expected: grantedUiamOnly,
      },
      {
        title: 'UIAM service account outside serverless',
        credential: 'uiamServiceAccount',
        config: 'esOnly',
        expected: {
          boom: `Error creating API key for rule - Failed to create UIAM API key "uiam-${NAME}": UIAM is not enabled`,
        },
      },
    ];

    it.each(table)(
      '$title ($credential / $config)',
      async ({ credential, config, internal, apiKeyOwnership, cloneHeader, expected }) => {
        const { headers } = CREDENTIALS[credential];
        const { context } = await setup({
          config,
          credential,
          internal,
          headers: cloneHeader
            ? { ...headers, [ALERTING_CLONE_API_KEY_HEADER]: 'true' }
            : undefined,
        });
        uiamApiKeys.grant.mockResolvedValue(UIAM_GRANTED);
        securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue(ES_GRANTED);
        securityService.authc.apiKeys.cloneAsInternalUser.mockResolvedValue(ES_CLONED);

        const create = () =>
          createNewAPIKeySet(context, {
            id: '123',
            ruleName: 'rule-name',
            username: 'test',
            profileUid: 'u_profile_test',
            shouldUpdateApiKey: true,
            apiKeyOwnership,
          });

        if ('boom' in expected) {
          expectError(await captureError(create), { message: expected.boom, boomStatus: 400 });
        } else {
          expect(await create()).toEqual(expected);
        }
      }
    );

    test('rewraps any ES grant failure, even a 403 Boom, into a 400 (current behavior)', async () => {
      const { context } = await setup({ config: 'esOnly' });
      securityService.authc.apiKeys.grantAsInternalUser.mockRejectedValue(
        Boom.forbidden('security_exception')
      );

      expectError(
        await captureError(() =>
          createNewAPIKeySet(context, {
            id: '123',
            ruleName: 'rule-name',
            username: 'test',
            profileUid: 'u_profile_test',
            shouldUpdateApiKey: true,
          })
        ),
        { message: 'Error creating API key for rule - security_exception', boomStatus: 400 }
      );
    });
  });
});
