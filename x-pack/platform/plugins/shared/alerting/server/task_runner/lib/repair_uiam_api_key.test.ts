/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { SavedObjectsErrorHelpers, SPACES_EXTENSION_ID } from '@kbn/core/server';
import { API_KEY_PENDING_INVALIDATION_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { ErrorWithReason } from '../../lib/error_with_reason';
import { RuleExecutionStatusErrorReasons } from '../../types';
import type { RawRule } from '../../types';
import { ApiKeyType, type TaskRunnerContext } from '../types';
import {
  isMissingUiamApiKeyLastRunError,
  isMissingUiamApiKeyRunError,
  repairUiamApiKey,
} from './repair_uiam_api_key';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const createAuthError = (code: string) =>
  Object.assign(new Error('security_exception'), {
    statusCode: 401,
    body: { error: { type: 'security_exception', caused_by: { authentication_error_code: code } } },
  });

const MISSING_KEY_ERROR = createAuthError('0x28D520');

const getRawRule = (overrides: Partial<RawRule> = {}): RawRule =>
  ({
    name: 'my rule',
    enabled: true,
    apiKey: Buffer.from('es-id:es-secret').toString('base64'),
    uiamApiKey: Buffer.from('stale-id:essu_stale').toString('base64'),
    apiKeyCreatedByUser: false,
    ...overrides,
  } as RawRule);

const setup = ({
  uiamConvert,
  apiKeyType = ApiKeyType.UIAM,
  shouldGrantUiam = true,
  rawRule = getRawRule(),
}: {
  uiamConvert?: jest.Mock;
  apiKeyType?: ApiKeyType;
  shouldGrantUiam?: boolean;
  rawRule?: RawRule;
} = {}) => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const unsafeClient = savedObjectsServiceMock.createStartContract().getUnsafeInternalClient();
  savedObjects.getUnsafeInternalClient = jest.fn().mockReturnValue(unsafeClient);

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

  return { context, savedObjects, unsafeClient, encryptedSavedObjectsClient };
};

const callRepair = (context: TaskRunnerContext) =>
  repairUiamApiKey({ context, logger, ruleId: 'rule-1', spaceId: 'default' });

beforeEach(() => jest.clearAllMocks());

describe('isMissingUiamApiKeyRunError()', () => {
  test('returns true for an Elasticsearch error reporting a UIAM API key UIAM no longer knows', () => {
    expect(isMissingUiamApiKeyRunError(MISSING_KEY_ERROR)).toBe(true);
  });

  test('unwraps the alerting framework ErrorWithReason decoration', () => {
    expect(
      isMissingUiamApiKeyRunError(
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, MISSING_KEY_ERROR)
      )
    ).toBe(true);
  });

  test('unwraps a rule type that rethrew with the original error as `cause`', () => {
    expect(
      isMissingUiamApiKeyRunError(
        new ErrorWithReason(
          RuleExecutionStatusErrorReasons.Execute,
          new Error('failed to query index', { cause: MISSING_KEY_ERROR })
        )
      )
    ).toBe(true);
  });

  test('returns false when the key is valid but client authentication was wrong', () => {
    expect(isMissingUiamApiKeyRunError(createAuthError('0x8560B2'))).toBe(false);
  });

  test('returns false for the UIAM API key rejections we deliberately do not act on', () => {
    // APIKEY_REVOKED and APIKEY_EXPIRED: see UIAM_API_KEY_MISSING_CODE for why a re-grant would be
    // wrong (or futile) for these.
    expect(isMissingUiamApiKeyRunError(createAuthError('0xD38358'))).toBe(false);
    expect(isMissingUiamApiKeyRunError(createAuthError('0xE436AE'))).toBe(false);
  });

  test('returns false for unrelated rule run failures', () => {
    expect(isMissingUiamApiKeyRunError(new Error('boom'))).toBe(false);
    expect(
      isMissingUiamApiKeyRunError(
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, new Error('boom'))
      )
    ).toBe(false);
  });

  test('does not loop on a self-referencing cause chain', () => {
    const error: Error & { cause?: unknown } = new Error('boom');
    error.cause = error;

    expect(isMissingUiamApiKeyRunError(error)).toBe(false);
  });
});

describe('isMissingUiamApiKeyLastRunError()', () => {
  // Both messages are the text production actually records, taken from `siem.*` runs in
  // production eu-west-1. Neither retains the structured Elasticsearch error, which is why these
  // runs are matched on the message rather than through isMissingUiamApiKeyRunError().
  const STRINGIFIED_RESPONSE_ERROR = [
    'security_exception',
    '\tCaused by:',
    '\t\tsecurity_exception: failed to authenticate cloud API key: [0x28D520]',
    '\tRoot causes:',
    '\t\tsecurity_exception: failed to authenticate cloud API key: [0x28D520]',
  ].join('\n');

  const WRAPPED_BY_RULE_TYPE = `unable to fetch exception list items, message: "${STRINGIFIED_RESPONSE_ERROR}" full error: "ResponseError: ${STRINGIFIED_RESPONSE_ERROR}"`;

  test('returns true for a stringified Elasticsearch error the rule type recorded as-is', () => {
    expect(
      isMissingUiamApiKeyLastRunError([{ message: STRINGIFIED_RESPONSE_ERROR, userError: false }])
    ).toBe(true);
  });

  test('returns true when the rule type wrapped the error in its own message', () => {
    expect(
      isMissingUiamApiKeyLastRunError([{ message: WRAPPED_BY_RULE_TYPE, userError: false }])
    ).toBe(true);
  });

  test('returns true when only one of several recorded errors reports the missing key', () => {
    expect(
      isMissingUiamApiKeyLastRunError([
        { message: 'a different rule execution problem', userError: false },
        { message: STRINGIFIED_RESPONSE_ERROR, userError: false },
      ])
    ).toBe(true);
  });

  test('requires the full Elasticsearch phrase, not just the code', () => {
    // A detection rule searching for authentication failures can put the bare code into its own
    // error text; re-granting a key off that would be wrong.
    expect(
      isMissingUiamApiKeyLastRunError([
        { message: 'found 3 documents matching "0x28D520"', userError: false },
      ])
    ).toBe(false);
  });

  test('ignores errors the rule author is responsible for', () => {
    expect(
      isMissingUiamApiKeyLastRunError([{ message: STRINGIFIED_RESPONSE_ERROR, userError: true }])
    ).toBe(false);
  });

  test('returns false for unrelated or absent run errors', () => {
    expect(isMissingUiamApiKeyLastRunError([])).toBe(false);
    expect(isMissingUiamApiKeyLastRunError([{ message: 'boom', userError: false }])).toBe(false);
  });
});

describe('repairUiamApiKey()', () => {
  test('converts the Elasticsearch API key and persists the fresh UIAM key on the rule', async () => {
    const rawRule = getRawRule();
    const { context, savedObjects, unsafeClient } = setup({ rawRule });

    await repairUiamApiKey({ context, logger, ruleId: 'rule-1', spaceId: 'space-a' });

    expect(context.uiamConvert).toHaveBeenCalledWith([rawRule.apiKey]);
    expect(savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, API_KEY_PENDING_INVALIDATION_TYPE],
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
    expect(unsafeClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-1',
      { ...rawRule, uiamApiKey: Buffer.from('fresh-id:essu_fresh').toString('base64') },
      { mergeAttributes: false, version: 'WzQyLDFd', namespace: 'space-a' }
    );
  });

  test('honours a non-default space on both the re-grant and leak-removal writes', async () => {
    // The Spaces extension rejects a caller-supplied namespace on `update`. Excluding it is
    // what makes this write target `my-space` instead of throwing (or silently hitting
    // `default`). The default space is unaffected either way: `spaceIdToNamespace('default')`
    // is undefined, which is falsy and slips past the extension.
    const { context: regrantContext, unsafeClient: regrantClient } = setup();
    await repairUiamApiKey({
      context: regrantContext,
      logger,
      ruleId: 'rule-1',
      spaceId: 'my-space',
    });
    expect(regrantClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-1',
      expect.any(Object),
      expect.objectContaining({ namespace: 'my-space' })
    );

    const { context: leakContext, unsafeClient: leakClient } = setup({
      rawRule: getRawRule({ apiKeyCreatedByUser: true }),
    });
    await repairUiamApiKey({
      context: leakContext,
      logger,
      ruleId: 'rule-1',
      spaceId: 'my-space',
    });
    expect(leakClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'rule-1',
      expect.any(Object),
      expect.objectContaining({ namespace: 'my-space' })
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

  test('does not write anything when the conversion fails', async () => {
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
    [
      'Saved Objects rejects the write as a client-side validation error',
      SavedObjectsErrorHelpers.createBadRequestError('invalid attributes'),
    ],
    [
      'the Spaces extension rejects the caller-supplied namespace before the write reaches Elasticsearch',
      new Error(
        'Namespace cannot be specified by the caller when the spaces extension is enabled. Spaces currently determines the namespace.'
      ),
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
