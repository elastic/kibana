/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RawRule } from '../../types';
import type { RulesClientContext } from '../types';
import { createRuleSavedObject } from './create_rule_saved_object';
import { scheduleTask } from './schedule_task';

jest.mock('../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('./schedule_task', () => ({
  scheduleTask: jest.fn(),
}));

const bulkMarkMock = bulkMarkApiKeysForInvalidation as jest.Mock;
const scheduleTaskMock = scheduleTask as jest.Mock;

const encode = (value: string) => Buffer.from(value).toString('base64');
const ES_KEY = encode('es-id:es-secret');
const UIAM_KEY = encode('uiam-id:essu_secret');

describe('createRuleSavedObject() API key invalidation characterization', () => {
  const logger = loggingSystemMock.create().get();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const context = {
    logger,
    unsecuredSavedObjectsClient,
    kibanaVersion: 'v8.0.0',
    minimumScheduleIntervalInMs: 0,
    minimumScheduleInterval: { value: '1m', enforce: false },
  } as unknown as RulesClientContext;

  const buildRawRule = (attributes: Partial<RawRule>): RawRule =>
    ({
      name: 'rule-name',
      alertTypeId: 'myType',
      consumer: 'myApp',
      schedule: { interval: '1m' },
      enabled: true,
      ...attributes,
    } as RawRule);

  const run = (rawRule: RawRule) =>
    createRuleSavedObject(context, {
      intervalInMs: 60000,
      rawRule,
      references: [],
      ruleId: '1',
      returnRuleAttributes: true,
    });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('when the rule saved object create fails', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.create.mockRejectedValue(new Error('Fail'));
    });

    test.each<[string, Partial<RawRule>, string[]]>([
      [
        'framework ES + UIAM',
        { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false },
        [ES_KEY, UIAM_KEY],
      ],
      [
        'apiKeyCreatedByUser=null',
        { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: null },
        [ES_KEY, UIAM_KEY],
      ],
      [
        'framework UIAM only',
        { apiKey: null, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false },
        [UIAM_KEY],
      ],
      [
        'user-created ES + UIAM calls with an empty list (current behavior)',
        { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: true },
        [],
      ],
      [
        'user-created raw essu_ calls with an empty list (current behavior)',
        { apiKey: null, uiamApiKey: 'essu_raw', apiKeyCreatedByUser: true },
        [],
      ],
      ['no keys calls with an empty list (current behavior)', { apiKey: null }, []],
    ])('%s', async (_title, attributes, expected) => {
      await expect(run(buildRawRule(attributes))).rejects.toThrow('Fail');

      expect(bulkMarkMock).toHaveBeenCalledTimes(1);
      expect(bulkMarkMock).toHaveBeenCalledWith(
        { apiKeys: expected },
        logger,
        unsecuredSavedObjectsClient
      );
    });
  });

  test('does not invalidate keys when task scheduling fails after the rule is created (current behavior)', async () => {
    const rawRule = buildRawRule({
      apiKey: ES_KEY,
      uiamApiKey: UIAM_KEY,
      apiKeyCreatedByUser: false,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: rawRule,
      references: [],
    });
    scheduleTaskMock.mockRejectedValue(new Error('TM fail'));

    await expect(run(rawRule)).rejects.toThrow('TM fail');

    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      undefined
    );
    expect(bulkMarkMock).not.toHaveBeenCalled();
  });

  test('does not invalidate keys when the rule is created', async () => {
    const rawRule = buildRawRule({
      enabled: false,
      apiKey: ES_KEY,
      uiamApiKey: UIAM_KEY,
      apiKeyCreatedByUser: false,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: rawRule,
      references: [],
    });

    await run(rawRule);

    expect(bulkMarkMock).not.toHaveBeenCalled();
  });
});
