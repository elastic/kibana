/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExternalUiamCredential } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getFakeKibanaRequest, validateRuleAndCreateFakeRequest } from './rule_loader';
import type { GetFakeKibanaRequestOptions } from './rule_loader';
import { ApiKeyType, type TaskRunnerContext } from './types';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import type { RawRule, Rule } from '../types';
import { mockedRawRuleSO } from './fixtures';
import { getAlertFromRaw } from '../rules_client/lib/get_alert_from_raw';
import { alertingUiamTelemetry } from '../api_keys/uiam_telemetry';
import type { CredentialReason, CredentialType } from '../api_keys/uiam_telemetry';
import { UIAM_LOGS_USAGE_TAGS } from '../constants';

jest.mock('../rules_client/lib/get_alert_from_raw');
const mockGetAlertFromRaw = getAlertFromRaw as jest.MockedFunction<typeof getAlertFromRaw>;

const b64 = (value: string) => Buffer.from(value).toString('base64');

const ES_API_KEY = b64('es-id:es-secret');
const ENCODED_UIAM_API_KEY = b64('uiam-id:essu_uiam_secret');
const ENCODED_NON_UIAM_API_KEY = b64('uiam-id:not-a-uiam-secret');
const RAW_UIAM_API_KEY = 'essu_raw_secret';
const SPACE_ID = 'rule-space';
const RULE_ID = 'rule-id-1';

const FALLBACK_MESSAGES = {
  user_created_key:
    'UIAM API key is not provided to create a fake request, falling back to ES API key created by the user.',
  likely_non_cloud_user:
    'UIAM API key is not provided because the Elasticsearch API key creator is likely a non-Cloud user, falling back to regular API key.',
  unexpected:
    'UIAM API key is not provided to create a fake request, falling back to regular API key.',
} as const;
type FallbackReason = keyof typeof FALLBACK_MESSAGES;
const ES_TO_UIAM_FALLBACK_MESSAGE =
  'ES API key is not provided to create a fake request, falling back to UIAM API key.';

const MODES = {
  uiamRun: { shouldGrantUiam: true, apiKeyType: ApiKeyType.UIAM },
  esOnly: { shouldGrantUiam: false, apiKeyType: ApiKeyType.ES },
  uiamTypeWithoutUiam: { shouldGrantUiam: false, apiKeyType: ApiKeyType.UIAM },
  uiamGrantEsRun: { shouldGrantUiam: true, apiKeyType: ApiKeyType.ES },
} as const;
type ModeName = keyof typeof MODES;
const NON_UIAM_RUN_MODES: ModeName[] = ['esOnly', 'uiamTypeWithoutUiam', 'uiamGrantEsRun'];

let logger: jest.Mocked<Logger>;
let recordUiamApiKeyFallbackSpy: jest.SpyInstance;
let recordRuleRunSpy: jest.SpyInstance;

const createContext = (mode: ModeName) =>
  ({
    ...MODES[mode],
    logger,
    actionsPlugin: { isSystemActionConnector: jest.fn().mockReturnValue(false) },
  } as unknown as TaskRunnerContext);

const debugLabels = (ruleId?: string) => ({
  labels: { ...(ruleId && { ruleId }), spaceId: SPACE_ID },
  tags: UIAM_LOGS_USAGE_TAGS,
});

interface ExpectedRun {
  authorization?: string;
  effectiveApiKey: string | null;
  credentialType: CredentialType;
  credentialReason: CredentialReason;
  external: boolean;
  fallback?: FallbackReason;
  debugMessage?: string;
}

const expectRun = (
  { fakeRequest, effectiveApiKey, credentialType }: ReturnType<typeof getFakeKibanaRequest>,
  expected: ExpectedRun,
  ruleId?: string
) => {
  expect(fakeRequest.headers).toEqual(
    expected.authorization === undefined ? {} : { authorization: expected.authorization }
  );
  expect(fakeRequest.isFakeRequest).toBe(true);
  expect(fakeRequest.spaceId).toBe(SPACE_ID);
  expect({ effectiveApiKey, credentialType }).toEqual({
    effectiveApiKey: expected.effectiveApiKey,
    credentialType: expected.credentialType,
  });
  expect(isExternalUiamCredential(fakeRequest)).toBe(expected.external);
  expect(recordRuleRunSpy.mock.calls).toEqual([
    [expected.credentialType, expected.credentialReason],
  ]);
  expect(recordUiamApiKeyFallbackSpy.mock.calls).toEqual(
    expected.fallback ? [[expected.fallback]] : []
  );
  expect(logger.debug.mock.calls).toEqual(
    expected.debugMessage ? [[expected.debugMessage, debugLabels(ruleId)]] : []
  );
  expect(logger.warn).not.toHaveBeenCalled();
  expect(logger.error).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.resetAllMocks();
  logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  recordUiamApiKeyFallbackSpy = jest
    .spyOn(alertingUiamTelemetry, 'recordUiamApiKeyFallback')
    .mockImplementation(() => {});
  recordRuleRunSpy = jest
    .spyOn(alertingUiamTelemetry, 'recordRuleRun')
    .mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('rule_loader API key characterization', () => {
  describe('getFakeKibanaRequest() when rules run on UIAM keys and the rule has no UIAM key', () => {
    // [apiKey, apiKeyCreatedByUser, apiKeyOwner, fallback reason, credential type, credential reason]
    const table: Array<
      [
        string | null,
        boolean | null | undefined,
        string | null | undefined,
        FallbackReason,
        CredentialType,
        CredentialReason
      ]
    > = [
      [ES_API_KEY, true, 'elastic', 'user_created_key', 'es_api_key', 'user_created_key'],
      [ES_API_KEY, true, undefined, 'user_created_key', 'es_api_key', 'user_created_key'],
      [ES_API_KEY, true, '1234567890', 'user_created_key', 'es_api_key', 'user_created_key'],
      [
        ES_API_KEY,
        false,
        'elastic',
        'likely_non_cloud_user',
        'es_api_key',
        'fallback_likely_non_cloud_user',
      ],
      [
        ES_API_KEY,
        null,
        ' elastic ',
        'likely_non_cloud_user',
        'es_api_key',
        'fallback_likely_non_cloud_user',
      ],
      [
        ES_API_KEY,
        undefined,
        '12a',
        'likely_non_cloud_user',
        'es_api_key',
        'fallback_likely_non_cloud_user',
      ],
      [ES_API_KEY, false, '1234567890', 'unexpected', 'es_api_key', 'fallback_unexpected'],
      [ES_API_KEY, false, ' 1234 ', 'unexpected', 'es_api_key', 'fallback_unexpected'],
      [ES_API_KEY, false, '   ', 'unexpected', 'es_api_key', 'fallback_unexpected'],
      [ES_API_KEY, false, '', 'unexpected', 'es_api_key', 'fallback_unexpected'],
      [ES_API_KEY, false, null, 'unexpected', 'es_api_key', 'fallback_unexpected'],
      [ES_API_KEY, undefined, undefined, 'unexpected', 'es_api_key', 'fallback_unexpected'],
      [null, true, 'elastic', 'likely_non_cloud_user', 'none', 'not_set'],
      [null, true, undefined, 'unexpected', 'none', 'not_set'],
      [null, false, 'elastic', 'likely_non_cloud_user', 'none', 'not_set'],
      [null, false, '123', 'unexpected', 'none', 'not_set'],
      ['', true, 'elastic', 'likely_non_cloud_user', 'none', 'not_set'],
      ['', true, undefined, 'unexpected', 'none', 'not_set'],
    ];

    it.each(table)(
      'apiKey=%j apiKeyCreatedByUser=%j apiKeyOwner=%j -> fallback %s, recorded as %s/%s (current behavior)',
      (apiKey, apiKeyCreatedByUser, apiKeyOwner, fallback, credentialType, credentialReason) => {
        for (const uiamApiKey of [undefined, null, '']) {
          for (const ruleId of [undefined, RULE_ID]) {
            jest.clearAllMocks();
            const options: GetFakeKibanaRequestOptions = {
              uiamApiKey,
              uiamApiKeyExternal: true,
              apiKeyCreatedByUser,
              apiKeyOwner,
              ruleId,
            };

            expectRun(
              getFakeKibanaRequest(createContext('uiamRun'), SPACE_ID, apiKey, options),
              {
                authorization: apiKey ? `ApiKey ${apiKey}` : undefined,
                effectiveApiKey: apiKey ? apiKey : null,
                credentialType,
                credentialReason,
                external: false,
                fallback,
                debugMessage: FALLBACK_MESSAGES[fallback],
              },
              ruleId
            );
          }
        }
      }
    );

    test('records the fallback before the rule run (current behavior)', () => {
      getFakeKibanaRequest(createContext('uiamRun'), SPACE_ID, ES_API_KEY, {});

      expect(recordUiamApiKeyFallbackSpy.mock.invocationCallOrder[0]).toBeLessThan(
        recordRuleRunSpy.mock.invocationCallOrder[0]
      );
    });
  });

  describe('getFakeKibanaRequest() when rules run on UIAM keys and the rule has a UIAM key', () => {
    // [stored uiamApiKey, presented secret]
    const shapes: Array<[string, string]> = [
      [ENCODED_UIAM_API_KEY, 'essu_uiam_secret'],
      [RAW_UIAM_API_KEY, RAW_UIAM_API_KEY],
      [ENCODED_NON_UIAM_API_KEY, ENCODED_NON_UIAM_API_KEY],
      ['not-base64-garbage', 'not-base64-garbage'],
    ];
    const createdByUser: Array<[boolean | null | undefined, CredentialReason]> = [
      [true, 'user_created_key'],
      [false, 'provisioned'],
      [null, 'provisioned'],
      [undefined, 'provisioned'],
    ];
    const table = shapes.flatMap(([stored, presented]) =>
      createdByUser.map(
        ([apiKeyCreatedByUser, reason]): [
          string,
          string,
          boolean | null | undefined,
          CredentialReason
        ] => [stored, presented, apiKeyCreatedByUser, reason]
      )
    );

    it.each(table)(
      'uiamApiKey=%s presents %s; apiKeyCreatedByUser=%j -> %s (current behavior)',
      (uiamApiKey, presented, apiKeyCreatedByUser, credentialReason) => {
        for (const apiKey of [ES_API_KEY, null]) {
          for (const [uiamApiKeyExternal, external] of [
            [true, true],
            [false, false],
            [null, false],
            [undefined, false],
          ] as const) {
            jest.clearAllMocks();
            expectRun(
              getFakeKibanaRequest(createContext('uiamRun'), SPACE_ID, apiKey, {
                uiamApiKey,
                uiamApiKeyExternal,
                apiKeyCreatedByUser,
                apiKeyOwner: 'elastic',
                ruleId: RULE_ID,
              }),
              {
                authorization: `ApiKey ${presented}`,
                effectiveApiKey: presented,
                credentialType: 'uiam_api_key',
                credentialReason,
                external,
              }
            );
          }
        }
      }
    );
  });

  describe('getFakeKibanaRequest() when rules do not run on UIAM keys', () => {
    interface Row {
      label: string;
      apiKey: string | null;
      options: GetFakeKibanaRequestOptions;
      expected: ExpectedRun;
    }
    const table: Row[] = [
      {
        label: 'ES key wins over a UIAM key, never marked external',
        apiKey: ES_API_KEY,
        options: {
          uiamApiKey: ENCODED_UIAM_API_KEY,
          uiamApiKeyExternal: true,
          apiKeyCreatedByUser: true,
        },
        expected: {
          authorization: `ApiKey ${ES_API_KEY}`,
          effectiveApiKey: ES_API_KEY,
          credentialType: 'es_api_key',
          credentialReason: 'config',
          external: false,
        },
      },
      {
        label: 'ES key only',
        apiKey: ES_API_KEY,
        options: { apiKeyCreatedByUser: false, apiKeyOwner: '123' },
        expected: {
          authorization: `ApiKey ${ES_API_KEY}`,
          effectiveApiKey: ES_API_KEY,
          credentialType: 'es_api_key',
          credentialReason: 'config',
          external: false,
        },
      },
      {
        label: 'falls back to an encoded UIAM key',
        apiKey: null,
        options: { uiamApiKey: ENCODED_UIAM_API_KEY, apiKeyCreatedByUser: false },
        expected: {
          authorization: 'ApiKey essu_uiam_secret',
          effectiveApiKey: 'essu_uiam_secret',
          credentialType: 'uiam_api_key',
          credentialReason: 'provisioned',
          external: false,
          debugMessage: ES_TO_UIAM_FALLBACK_MESSAGE,
        },
      },
      {
        label: 'falls back to a raw user-created external UIAM key',
        apiKey: null,
        options: {
          uiamApiKey: RAW_UIAM_API_KEY,
          uiamApiKeyExternal: true,
          apiKeyCreatedByUser: true,
        },
        expected: {
          authorization: `ApiKey ${RAW_UIAM_API_KEY}`,
          effectiveApiKey: RAW_UIAM_API_KEY,
          credentialType: 'uiam_api_key',
          credentialReason: 'user_created_key',
          external: true,
          debugMessage: ES_TO_UIAM_FALLBACK_MESSAGE,
        },
      },
      {
        label: 'falls back to a raw UIAM key with uiamApiKeyExternal false',
        apiKey: null,
        options: {
          uiamApiKey: RAW_UIAM_API_KEY,
          uiamApiKeyExternal: false,
          apiKeyCreatedByUser: null,
        },
        expected: {
          authorization: `ApiKey ${RAW_UIAM_API_KEY}`,
          effectiveApiKey: RAW_UIAM_API_KEY,
          credentialType: 'uiam_api_key',
          credentialReason: 'provisioned',
          external: false,
          debugMessage: ES_TO_UIAM_FALLBACK_MESSAGE,
        },
      },
      {
        label: 'falls back to a non-UIAM encoded value as-is',
        apiKey: null,
        options: { uiamApiKey: ENCODED_NON_UIAM_API_KEY },
        expected: {
          authorization: `ApiKey ${ENCODED_NON_UIAM_API_KEY}`,
          effectiveApiKey: ENCODED_NON_UIAM_API_KEY,
          credentialType: 'uiam_api_key',
          credentialReason: 'provisioned',
          external: false,
          debugMessage: ES_TO_UIAM_FALLBACK_MESSAGE,
        },
      },
      {
        label: 'no keys',
        apiKey: null,
        options: { uiamApiKeyExternal: true, apiKeyCreatedByUser: true },
        expected: {
          effectiveApiKey: null,
          credentialType: 'none',
          credentialReason: 'not_set',
          external: false,
        },
      },
      {
        label: 'empty-string keys count as missing',
        apiKey: '',
        options: { uiamApiKey: '' },
        expected: {
          effectiveApiKey: null,
          credentialType: 'none',
          credentialReason: 'not_set',
          external: false,
        },
      },
    ];

    it.each(table)('$label (current behavior)', ({ apiKey, options, expected }) => {
      for (const mode of NON_UIAM_RUN_MODES) {
        for (const ruleId of [undefined, RULE_ID]) {
          jest.clearAllMocks();
          expectRun(
            getFakeKibanaRequest(createContext(mode), SPACE_ID, apiKey, { ...options, ruleId }),
            expected,
            ruleId
          );
        }
      }
    });

    test('defaults options to {} (current behavior)', () => {
      expectRun(getFakeKibanaRequest(createContext('esOnly'), SPACE_ID, ES_API_KEY), {
        authorization: `ApiKey ${ES_API_KEY}`,
        effectiveApiKey: ES_API_KEY,
        credentialType: 'es_api_key',
        credentialReason: 'config',
        external: false,
      });
    });
  });

  describe('validateRuleAndCreateFakeRequest() credentials and uiamApiKeyId', () => {
    const ruleTypeRegistry = ruleTypeRegistryMock.create();

    beforeEach(() => {
      mockGetAlertFromRaw.mockReturnValue({
        name: 'rule-name',
        alertTypeId: 'test',
        params: { bar: true },
      } as unknown as Rule);
    });

    // [mode, apiKey, uiamApiKey, presented credential, expected uiamApiKeyId, marked external]
    const table: Array<
      [ModeName, string | null, string | null, string | null, string | undefined, boolean]
    > = [
      ['uiamRun', ES_API_KEY, ENCODED_UIAM_API_KEY, 'essu_uiam_secret', 'uiam-id', true],
      ['uiamRun', null, RAW_UIAM_API_KEY, RAW_UIAM_API_KEY, undefined, true],
      ['uiamRun', null, ENCODED_NON_UIAM_API_KEY, ENCODED_NON_UIAM_API_KEY, undefined, true],
      ['uiamRun', ES_API_KEY, null, ES_API_KEY, undefined, false],
      ['uiamGrantEsRun', ES_API_KEY, ENCODED_UIAM_API_KEY, ES_API_KEY, undefined, false],
      ['esOnly', null, ENCODED_UIAM_API_KEY, 'essu_uiam_secret', 'uiam-id', true],
      ['uiamTypeWithoutUiam', null, ENCODED_UIAM_API_KEY, 'essu_uiam_secret', 'uiam-id', true],
      ['esOnly', null, null, null, undefined, false],
    ];

    it.each(table)(
      '%s: apiKey=%s uiamApiKey=%s -> presents %s, uiamApiKeyId %s, external %s (current behavior)',
      (mode, apiKey, uiamApiKey, presented, uiamApiKeyId, external) => {
        const rawRule: RawRule = {
          ...mockedRawRuleSO.attributes,
          enabled: true,
          apiKey,
          uiamApiKey,
          uiamApiKeyExternal: true,
          apiKeyCreatedByUser: false,
          apiKeyOwner: '1234',
        };

        const result = validateRuleAndCreateFakeRequest({
          context: createContext(mode),
          logger,
          ruleData: { rawRule, references: [], version: '3' },
          ruleId: RULE_ID,
          ruleTypeRegistry,
          spaceId: SPACE_ID,
        });

        expect(result).toEqual({
          effectiveApiKey: presented,
          uiamApiKeyId,
          fakeRequest: result.fakeRequest,
          rule: {
            name: 'rule-name',
            alertTypeId: 'test',
            params: { bar: true },
            snoozedInstances: [],
          },
          validatedParams: { bar: true },
          version: '3',
        });
        expect(result.fakeRequest.headers).toEqual(
          presented === null ? {} : { authorization: `ApiKey ${presented}` }
        );
        expect(isExternalUiamCredential(result.fakeRequest)).toBe(external);
        for (const [, labels] of logger.debug.mock.calls) {
          expect(labels).toEqual(debugLabels(RULE_ID));
        }
      }
    );
  });
});
