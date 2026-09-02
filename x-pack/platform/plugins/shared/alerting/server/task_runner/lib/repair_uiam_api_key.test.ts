/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE } from '@kbn/uiam-api-keys-provisioning-status';
import {
  API_KEY_PENDING_INVALIDATION_TYPE,
  RULE_SAVED_OBJECT_TYPE,
  UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
} from '../../saved_objects';
import {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import { ErrorWithReason } from '../../lib/error_with_reason';
import { RuleExecutionStatusErrorReasons } from '../../types';
import type { RawRule } from '../../types';
import { ApiKeyType, type TaskRunnerContext } from '../types';
import {
  isUnusableUiamApiKeyLastRunError,
  isUnusableUiamApiKeyRunError,
  repairUiamApiKey,
} from './repair_uiam_api_key';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const createAuthError = (code: string) =>
  Object.assign(new Error('security_exception'), {
    statusCode: 401,
    body: { error: { type: 'security_exception', caused_by: { authentication_error_code: code } } },
  });

/**
 * The 403 UIAM returns when it authenticates a cloud API key and then declines to resolve its
 * privileges. There is no `authentication_error_code` and no `0x` code of any kind on this shape.
 */
const createAuthzError = (
  reason = 'failed to authorize cloud API key for project [b5fa1e0e]',
  placement: 'reason' | 'caused_by' | 'root_cause' = 'reason'
) =>
  Object.assign(new Error('security_exception'), {
    statusCode: 403,
    body: {
      error: {
        type: 'security_exception',
        ...(placement === 'reason' ? { reason } : {}),
        ...(placement === 'caused_by' ? { caused_by: { type: 'security_exception', reason } } : {}),
        ...(placement === 'root_cause'
          ? { root_cause: [{ type: 'security_exception', reason }] }
          : {}),
      },
    },
  });

const MISSING_KEY_ERROR = createAuthError('0x28D520');

/** The Elasticsearch API key id behind `getRawRule()`'s `apiKey`, which repair records are keyed on. */
const ES_API_KEY_ID = 'es-id';

const getRawRule = (overrides: Partial<RawRule> = {}): RawRule =>
  ({
    name: 'my rule',
    enabled: true,
    apiKey: Buffer.from(`${ES_API_KEY_ID}:es-secret`).toString('base64'),
    uiamApiKey: Buffer.from('stale-id:essu_stale').toString('base64'),
    apiKeyCreatedByUser: false,
    ...overrides,
  } as RawRule);

const setup = ({
  uiamConvert,
  apiKeyType = ApiKeyType.UIAM,
  shouldGrantUiam = true,
  rawRule = getRawRule(),
  repairRecord,
}: {
  uiamConvert?: jest.Mock;
  apiKeyType?: ApiKeyType;
  shouldGrantUiam?: boolean;
  rawRule?: RawRule;
  repairRecord?: Record<string, string>;
} = {}) => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const unsafeClient = savedObjectsServiceMock.createStartContract().getUnsafeInternalClient();
  savedObjects.getUnsafeInternalClient = jest.fn().mockReturnValue(unsafeClient);
  unsafeClient.get = jest
    .fn()
    .mockImplementation(() =>
      repairRecord
        ? Promise.resolve({ attributes: repairRecord })
        : Promise.reject(
            SavedObjectsErrorHelpers.createGenericNotFoundError(
              UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
              'rule-1'
            )
          )
    );

  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
    id: 'rule-1',
    type: RULE_SAVED_OBJECT_TYPE,
    references: [],
    version: 'WzQyLDFd',
    attributes: rawRule,
  });

  const context = {
    apiKeyType,
    shouldGrantUiam,
    savedObjects,
    encryptedSavedObjectsClient,
    spaceIdToNamespace: (spaceId?: string) => (spaceId === 'default' ? undefined : spaceId),
    uiamConvert:
      uiamConvert ??
      jest.fn().mockResolvedValue({
        results: [{ status: 'success', id: 'fresh-id', key: 'essu_fresh' }],
      }),
  } as unknown as TaskRunnerContext;

  const ruleResultService = { addLastRunError: jest.fn() };

  return { context, savedObjects, unsafeClient, encryptedSavedObjectsClient, ruleResultService };
};

const callRepair = (
  context: TaskRunnerContext,
  ruleResultService?: { addLastRunError: jest.Mock }
) => repairUiamApiKey({ context, logger, ruleId: 'rule-1', spaceId: 'default', ruleResultService });

beforeEach(() => jest.clearAllMocks());

describe('isUnusableUiamApiKeyRunError()', () => {
  test('returns true for an Elasticsearch error reporting a UIAM API key UIAM no longer knows', () => {
    expect(isUnusableUiamApiKeyRunError(MISSING_KEY_ERROR)).toBe(true);
  });

  test('returns true for a 403 reporting that UIAM refused to authorize the key', () => {
    // The failure class that stranded `4de3f252` on `b5fa1e0e` for seven days: UIAM authenticates
    // the key and then declines to resolve its privileges, so there is no 401 and no code.
    expect(isUnusableUiamApiKeyRunError(createAuthzError())).toBe(true);
  });

  test.each(['caused_by', 'root_cause'] as const)(
    'returns true when the authorization refusal is reported on %s',
    (placement) => {
      expect(
        isUnusableUiamApiKeyRunError(
          createAuthzError('failed to authorize cloud API key for project [p]', placement)
        )
      ).toBe(true);
    }
  );

  test('unwraps the alerting framework ErrorWithReason decoration', () => {
    expect(
      isUnusableUiamApiKeyRunError(
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, MISSING_KEY_ERROR)
      )
    ).toBe(true);
    expect(
      isUnusableUiamApiKeyRunError(
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, createAuthzError())
      )
    ).toBe(true);
  });

  test('unwraps a rule type that rethrew with the original error as `cause`', () => {
    expect(
      isUnusableUiamApiKeyRunError(
        new ErrorWithReason(
          RuleExecutionStatusErrorReasons.Execute,
          new Error('failed to query index', { cause: MISSING_KEY_ERROR })
        )
      )
    ).toBe(true);
  });

  test('returns false when the key is valid but client authentication was wrong', () => {
    expect(isUnusableUiamApiKeyRunError(createAuthError('0x8560B2'))).toBe(false);
  });

  test('returns false for the UIAM API key rejections we deliberately do not act on', () => {
    // APIKEY_REVOKED and APIKEY_EXPIRED: see UIAM_API_KEY_MISSING_CODE for why a re-grant would be
    // wrong (or futile) for these.
    expect(isUnusableUiamApiKeyRunError(createAuthError('0xD38358'))).toBe(false);
    expect(isUnusableUiamApiKeyRunError(createAuthError('0xE436AE'))).toBe(false);
  });

  test('returns false for a 403 that is not about a cloud API key', () => {
    // Rules are refused for their own missing privileges all the time; those are not repairable.
    expect(
      isUnusableUiamApiKeyRunError(
        createAuthzError('action [indices:data/read/search] is unauthorized for user [elastic]')
      )
    ).toBe(false);
  });

  test('returns false when the authorization phrase arrives on a status other than 403', () => {
    // The status is part of the shape; a rule quoting the phrase in its own 500 is not a refusal.
    expect(
      isUnusableUiamApiKeyRunError(
        Object.assign(new Error('boom'), {
          statusCode: 500,
          body: { error: { reason: 'failed to authorize cloud API key for project [p]' } },
        })
      )
    ).toBe(false);
  });

  test('returns false for unrelated rule run failures', () => {
    expect(isUnusableUiamApiKeyRunError(new Error('boom'))).toBe(false);
    expect(
      isUnusableUiamApiKeyRunError(
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, new Error('boom'))
      )
    ).toBe(false);
  });

  test('does not loop on a self-referencing cause chain', () => {
    const error: Error & { cause?: unknown } = new Error('boom');
    error.cause = error;

    expect(isUnusableUiamApiKeyRunError(error)).toBe(false);
  });
});

describe('isUnusableUiamApiKeyLastRunError()', () => {
  // Both messages are the text production actually records, taken from `siem.*` runs in
  // production eu-west-1. Neither retains the structured Elasticsearch error, which is why these
  // runs are matched on the message rather than through isUnusableUiamApiKeyRunError().
  const STRINGIFIED_RESPONSE_ERROR = [
    'security_exception',
    '\tCaused by:',
    '\t\tsecurity_exception: failed to authenticate cloud API key: [0x28D520]',
    '\tRoot causes:',
    '\t\tsecurity_exception: failed to authenticate cloud API key: [0x28D520]',
  ].join('\n');

  const WRAPPED_BY_RULE_TYPE = `unable to fetch exception list items, message: "${STRINGIFIED_RESPONSE_ERROR}" full error: "ResponseError: ${STRINGIFIED_RESPONSE_ERROR}"`;

  // What `fetch_rule_execution_settings` records on `b5fa1e0e`, the call site that swallowed the
  // authorization refusal until it was widened to match this too.
  const STRINGIFIED_AUTHZ_ERROR =
    'Error fetching rule execution settings: security_exception: failed to authorize cloud API key for project [b5fa1e0e]';

  test('returns true for a stringified Elasticsearch error the rule type recorded as-is', () => {
    expect(
      isUnusableUiamApiKeyLastRunError([{ message: STRINGIFIED_RESPONSE_ERROR, userError: false }])
    ).toBe(true);
  });

  test('returns true for a recorded authorization refusal', () => {
    expect(
      isUnusableUiamApiKeyLastRunError([{ message: STRINGIFIED_AUTHZ_ERROR, userError: false }])
    ).toBe(true);
  });

  test('returns true when the rule type wrapped the error in its own message', () => {
    expect(
      isUnusableUiamApiKeyLastRunError([{ message: WRAPPED_BY_RULE_TYPE, userError: false }])
    ).toBe(true);
  });

  test('returns true when only one of several recorded errors reports the missing key', () => {
    expect(
      isUnusableUiamApiKeyLastRunError([
        { message: 'a different rule execution problem', userError: false },
        { message: STRINGIFIED_RESPONSE_ERROR, userError: false },
      ])
    ).toBe(true);
  });

  test('requires the full Elasticsearch phrase, not just the code', () => {
    // A detection rule searching for authentication failures can put the bare code into its own
    // error text; re-granting a key off that would be wrong.
    expect(
      isUnusableUiamApiKeyLastRunError([
        { message: 'found 3 documents matching "0x28D520"', userError: false },
      ])
    ).toBe(false);
  });

  test('ignores errors the rule author is responsible for', () => {
    expect(
      isUnusableUiamApiKeyLastRunError([{ message: STRINGIFIED_RESPONSE_ERROR, userError: true }])
    ).toBe(false);
    expect(
      isUnusableUiamApiKeyLastRunError([{ message: STRINGIFIED_AUTHZ_ERROR, userError: true }])
    ).toBe(false);
  });

  test('returns false for unrelated or absent run errors', () => {
    expect(isUnusableUiamApiKeyLastRunError([])).toBe(false);
    expect(isUnusableUiamApiKeyLastRunError([{ message: 'boom', userError: false }])).toBe(false);
  });
});

describe('repairUiamApiKey()', () => {
  test('converts the Elasticsearch API key and persists the fresh UIAM key on the rule', async () => {
    const rawRule = getRawRule();
    const { context, savedObjects, unsafeClient } = setup({ rawRule });

    await repairUiamApiKey({ context, logger, ruleId: 'rule-1', spaceId: 'space-a' });

    expect(context.uiamConvert).toHaveBeenCalledWith([rawRule.apiKey]);
    expect(savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: [
        RULE_SAVED_OBJECT_TYPE,
        API_KEY_PENDING_INVALIDATION_TYPE,
        UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
      ],
    });
    expect(unsafeClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-1',
      { ...rawRule, uiamApiKey: Buffer.from('fresh-id:essu_fresh').toString('base64') },
      { mergeAttributes: false, version: 'WzQyLDFd', namespace: 'space-a' }
    );
  });

  test('removes the leaked UIAM API key from a user-keyed rule instead of re-granting', async () => {
    // A rule holding both a user-created Elasticsearch key and a UIAM key is a state the rules
    // client refuses to create: it can only be the residue of the historical clone/update leak.
    const rawRule = getRawRule({ apiKeyCreatedByUser: true, uiamApiKeyExternal: false });
    const { context, unsafeClient } = setup({ rawRule });

    await repairUiamApiKey({ context, logger, ruleId: 'rule-1', spaceId: 'space-a' });

    expect(context.uiamConvert).not.toHaveBeenCalled();
    expect(unsafeClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-1',
      { ...rawRule, uiamApiKey: null, uiamApiKeyExternal: null },
      { mergeAttributes: false, version: 'WzQyLDFd', namespace: 'space-a' }
    );
    // The leaked key may be a clone's source rule's key, still in live use there — not Kibana's to
    // revoke on this rule's behalf.
    expect(unsafeClient.bulkCreate).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Removed the leaked UIAM API key'),
      expect.anything()
    );
  });

  test('reports a failed leak removal as a removal, not a re-grant', async () => {
    const { context, unsafeClient } = setup({
      rawRule: getRawRule({ apiKeyCreatedByUser: true }),
    });
    unsafeClient.update = jest
      .fn()
      .mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-1')
      );

    await callRepair(context);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to remove the leaked UIAM API key from the rule'),
      expect.anything()
    );
    // No key was minted, so there is nothing to queue for invalidation.
    expect(unsafeClient.bulkCreate).not.toHaveBeenCalled();
  });

  // Every skip logs a distinct reason: these lines are how an operator tells which check left a
  // broken rule alone, so identical messages would make the log useless.
  test.each([
    [
      'the key was created by the user and there is no leaked key to remove',
      { apiKeyCreatedByUser: true, apiKey: null },
      'it was created by the user, who manages its lifecycle',
    ],
    ['the rule has no UIAM API key', { uiamApiKey: null }, 'the rule does not have one'],
    [
      'there is no Elasticsearch API key to convert',
      { apiKey: null },
      'the rule has no Elasticsearch API key to convert',
    ],
  ])('does not re-grant when %s', async (_, overrides, expectedReason) => {
    const { context, unsafeClient } = setup({ rawRule: getRawRule(overrides) });

    await callRepair(context);

    expect(context.uiamConvert).not.toHaveBeenCalled();
    expect(unsafeClient.update).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Not re-granting the UIAM API key: ${expectedReason}.`,
      expect.anything()
    );
  });

  test('does not re-grant when the deployment does not run rules with UIAM API keys', async () => {
    const expectedMessage =
      'Not re-granting the UIAM API key: this deployment does not run rules with UIAM API keys.';

    const esOnly = setup({ apiKeyType: ApiKeyType.ES });
    await callRepair(esOnly.context);
    expect(esOnly.context.uiamConvert).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expectedMessage, expect.anything());

    const noUiam = setup({ shouldGrantUiam: false });
    await callRepair(noUiam.context);
    expect(noUiam.context.uiamConvert).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expectedMessage, expect.anything());
  });

  test('logs a different message for every reason it declines to re-grant', async () => {
    const messages = new Set<string>();

    for (const overrides of [
      { apiKeyCreatedByUser: true, apiKey: null },
      { uiamApiKey: null },
      { apiKey: null },
    ]) {
      const { context } = setup({ rawRule: getRawRule(overrides) });
      await callRepair(context);
    }
    const { context: esOnly } = setup({ apiKeyType: ApiKeyType.ES });
    await callRepair(esOnly);

    for (const [message] of logger.debug.mock.calls) {
      messages.add(String(message));
    }

    expect(messages.size).toBe(4);
  });

  test('reports failure when the rule can no longer be decrypted', async () => {
    const { context, encryptedSavedObjectsClient, unsafeClient } = setup();
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValue(
      new Error('Saved object [alert/rule-1] not found')
    );

    await callRepair(context);

    expect(context.uiamConvert).not.toHaveBeenCalled();
    expect(unsafeClient.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not found'),
      expect.anything()
    );
  });

  test('does not touch the rule when the conversion fails', async () => {
    const { context, unsafeClient } = setup({
      uiamConvert: jest.fn().mockResolvedValue({
        results: [{ status: 'failed', code: '0xCEE791', message: 'ES API key not found' }],
      }),
    });

    await callRepair(context);

    expect(unsafeClient.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('0xCEE791'),
      expect.anything()
    );
  });

  test.each([
    ['the convert API returns no result', { results: [] }],
    ['the license does not allow converting keys', null],
  ])('does not write anything when %s', async (_, convertResponse) => {
    const { context, unsafeClient } = setup({
      uiamConvert: jest.fn().mockResolvedValue(convertResponse),
    });

    await callRepair(context);

    expect(unsafeClient.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    // UIAM was never asked, so nothing is known about the credential and the next run must retry.
    expect(unsafeClient.create).not.toHaveBeenCalled();
  });

  test('reports failure when the conversion throws', async () => {
    const { context } = setup({ uiamConvert: jest.fn().mockRejectedValue(new Error('UIAM down')) });

    await callRepair(context);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('UIAM down'),
      expect.anything()
    );
  });

  test.each([
    [
      'a concurrent update wins the optimistic concurrency check',
      SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-1'),
    ],
    [
      'the rule was deleted while the run was in flight',
      SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-1'),
    ],
  ])('queues the minted key for invalidation when %s', async (_, writeError) => {
    const { context, unsafeClient } = setup();
    unsafeClient.update = jest.fn().mockRejectedValue(writeError);

    await callRepair(context);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(writeError.message),
      expect.anything()
    );
    // The write was rejected outright, so the key the convert API minted is referenced by nothing.
    expect(unsafeClient.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        attributes: expect.objectContaining({ apiKeyId: 'fresh-id', uiamApiKey: 'essu_fresh' }),
      }),
    ]);
  });

  test('leaves the minted key alone when the write may have committed anyway', async () => {
    const { context, unsafeClient } = setup();
    unsafeClient.update = jest.fn().mockRejectedValue(new Error('socket hang up'));

    await callRepair(context);

    // Revoking a key that did persist would break every subsequent run, so an ambiguous failure is
    // accepted as a bounded leak instead.
    expect(unsafeClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('does not queue anything for invalidation when no key was minted', async () => {
    const { context, unsafeClient } = setup({
      uiamConvert: jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-1')
        ),
    });

    await callRepair(context);

    expect(unsafeClient.bulkCreate).not.toHaveBeenCalled();
  });
});

// A rule can fail every minute, so an attempt that cannot work must be made once rather than once
// per run: `b5fa1e0e`'s rule alone would otherwise make ~1,440 convert calls a day.
describe('repairUiamApiKey() attempt records', () => {
  const expectRecord = (
    unsafeClient: ReturnType<typeof setup>['unsafeClient'],
    attributes: Record<string, unknown>
  ) =>
    expect(unsafeClient.create).toHaveBeenCalledWith(
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        entityId: 'rule-1',
        entityType: UiamApiKeyProvisioningEntityType.RULE,
        ...attributes,
      }),
      // Same document id the UIAM provisioning task writes, so the two cannot independently retry
      // the same doomed conversion.
      { id: 'rule-1', overwrite: true }
    );

  test('records a successful re-grant against the credential it converted', async () => {
    const { context, unsafeClient } = setup();

    await callRepair(context);

    expectRecord(unsafeClient, {
      status: UiamApiKeyProvisioningStatus.COMPLETED,
      apiKeyId: ES_API_KEY_ID,
    });
  });

  test('records the UIAM verdict and its code when the conversion fails', async () => {
    const { context, unsafeClient } = setup({
      uiamConvert: jest.fn().mockResolvedValue({
        results: [
          {
            status: 'failed',
            code: API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE,
            message: 'API key creator is not an organization member',
          },
        ],
      }),
    });

    await callRepair(context);

    expectRecord(unsafeClient, {
      status: UiamApiKeyProvisioningStatus.FAILED,
      errorCode: API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE,
      apiKeyId: ES_API_KEY_ID,
      message: expect.stringContaining('API key creator is not an organization member'),
    });
  });

  test('surfaces the UIAM verdict on the rule, not just in the log', async () => {
    // The convert response is the only place UIAM ever states why a key is unusable, so an operator
    // reads "API key creator is not an organization member" instead of a bare refusal.
    const { context, ruleResultService } = setup({
      uiamConvert: jest.fn().mockResolvedValue({
        results: [
          {
            status: 'failed',
            code: API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE,
            message: 'API key creator is not an organization member',
          },
        ],
      }),
    });

    await callRepair(context, ruleResultService);

    expect(ruleResultService.addLastRunError).toHaveBeenCalledWith(
      `Could not re-grant the rule's UIAM API key, so it stays unusable: [${API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE}] API key creator is not an organization member`
    );
  });

  test('does not attempt a re-grant again for a credential it already tried', async () => {
    // The loop a failure-only breaker misses: the conversion succeeded last time and the rule is
    // still failing, so repeating it would mint another key every run.
    const { context, unsafeClient } = setup({
      repairRecord: {
        status: UiamApiKeyProvisioningStatus.COMPLETED,
        apiKeyId: ES_API_KEY_ID,
      },
    });

    await callRepair(context);

    expect(context.uiamConvert).not.toHaveBeenCalled();
    expect(unsafeClient.update).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('already attempted for this rule'),
      expect.anything()
    );
  });

  test('attempts a re-grant again once the rule holds a different credential', async () => {
    // Re-saving a rule re-mints its Elasticsearch key under a new id, which is what fixed
    // `b58e29eb`. The breaker must not go on suppressing a repair after a genuine fix.
    const { context, unsafeClient } = setup({
      repairRecord: {
        status: UiamApiKeyProvisioningStatus.COMPLETED,
        apiKeyId: 'a-key-since-replaced',
      },
    });

    await callRepair(context);

    expect(context.uiamConvert).toHaveBeenCalled();
    expect(unsafeClient.update).toHaveBeenCalled();
  });

  test('never retries a permanent UIAM verdict, whichever credential the rule holds now', async () => {
    // These codes are about the identity that created the key, not the key itself, so re-minting the
    // Elasticsearch key cannot change the answer.
    const { context } = setup({
      repairRecord: {
        status: UiamApiKeyProvisioningStatus.FAILED,
        errorCode: API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE,
        apiKeyId: 'a-key-since-replaced',
      },
    });

    await callRepair(context);

    expect(context.uiamConvert).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`[${API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE}]`),
      expect.anything()
    );
  });

  test('honors a permanent verdict the provisioning task recorded, which carries no credential', async () => {
    const { context } = setup({
      repairRecord: {
        status: UiamApiKeyProvisioningStatus.FAILED,
        errorCode: API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE,
      },
    });

    await callRepair(context);

    expect(context.uiamConvert).not.toHaveBeenCalled();
  });

  test('still attempts a re-grant when a recorded failure was not a permanent verdict', async () => {
    // A bulk update failure the provisioning task recorded says nothing about this credential.
    const { context } = setup({
      repairRecord: { status: UiamApiKeyProvisioningStatus.FAILED, message: 'Error bulk updating' },
    });

    await callRepair(context);

    expect(context.uiamConvert).toHaveBeenCalled();
  });

  test('records the attempt when a minted key was stranded by the write', async () => {
    // #735's shape: the conversion succeeds and the write is refused outright, so every run would
    // mint and strand another key.
    const { context, unsafeClient } = setup();
    unsafeClient.update = jest
      .fn()
      .mockRejectedValue(new Error('Namespace cannot be specified by the caller'));

    await callRepair(context);

    expectRecord(unsafeClient, {
      status: UiamApiKeyProvisioningStatus.FAILED,
      apiKeyId: ES_API_KEY_ID,
      message: expect.stringContaining('Namespace cannot be specified by the caller'),
    });
  });

  test.each([
    ['a conflict', SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-1')],
    [
      'the rule being gone',
      SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-1'),
    ],
  ])('does not record an attempt the write cleanly rejected because of %s', async (_, error) => {
    const { context, unsafeClient } = setup();
    unsafeClient.update = jest.fn().mockRejectedValue(error);

    await callRepair(context);

    // The key it minted was queued for invalidation, so retrying costs nothing.
    expect(unsafeClient.create).not.toHaveBeenCalled();
  });

  test('does not record an attempt when UIAM could not be reached', async () => {
    const { context, unsafeClient } = setup({
      uiamConvert: jest.fn().mockRejectedValue(new Error('UIAM down')),
    });

    await callRepair(context);

    expect(unsafeClient.create).not.toHaveBeenCalled();
  });

  test('proceeds as a first attempt when the record cannot be read', async () => {
    // Refusing to repair because the bookkeeping is unreadable would turn a transient saved objects
    // failure into a rule that stays broken.
    const { context, unsafeClient } = setup();
    unsafeClient.get = jest.fn().mockRejectedValue(new Error('elasticsearch unavailable'));

    await callRepair(context);

    expect(context.uiamConvert).toHaveBeenCalled();
    expect(unsafeClient.update).toHaveBeenCalled();
  });

  test('still re-grants when recording the attempt fails', async () => {
    const { context, unsafeClient } = setup();
    unsafeClient.create = jest.fn().mockRejectedValue(new Error('status write failed'));

    await callRepair(context);

    expect(unsafeClient.update).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to record the UIAM API key re-grant attempt'),
      expect.anything()
    );
  });

  test('does not record anything for a rule it declined to repair', async () => {
    const { context, unsafeClient } = setup({ rawRule: getRawRule({ apiKey: null }) });

    await callRepair(context);

    expect(unsafeClient.create).not.toHaveBeenCalled();
  });
});
