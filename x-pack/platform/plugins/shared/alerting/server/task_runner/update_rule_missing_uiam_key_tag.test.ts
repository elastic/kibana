/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
} from '../application/rule/constants';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { mockedRawRuleSO } from './fixtures';
import type { RuleData } from './rule_loader';
import { ApiKeyType, type TaskRunnerContext } from './types';
import { updateRuleMissingUiamKeyTag } from './update_rule_missing_uiam_key_tag';

const ruleId = 'rule-id-1';
const spaceId = 'rule-space-id';
const savedObjects = savedObjectsServiceMock.createStartContract();
const unsafeSavedObjectsClient = savedObjectsServiceMock
  .createStartContract()
  .getUnsafeInternalClient();
const mockUpdate = jest.mocked(unsafeSavedObjectsClient.update);
const logger = loggingSystemMock.createLogger();

const context = {
  apiKeyType: ApiKeyType.UIAM,
  isServerless: true,
  logger,
  savedObjects,
  shouldGrantUiam: true,
  spaceIdToNamespace: jest.fn().mockReturnValue(spaceId),
} as unknown as TaskRunnerContext;

const getRuleData = (overrides: Partial<RuleData['rawRule']> = {}): RuleData => ({
  rawRule: { ...mockedRawRuleSO.attributes, ...overrides },
  references: [],
  version: '1',
});

describe('updateRuleMissingUiamKeyTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    savedObjects.getUnsafeInternalClient.mockReturnValue(unsafeSavedObjectsClient);
    mockUpdate.mockResolvedValue({
      attributes: {},
      id: ruleId,
      references: [],
      type: RULE_SAVED_OBJECT_TYPE,
      version: '2',
    });
  });

  test('replaces the legacy missing UIAM API key tag before execution', async () => {
    const result = await updateRuleMissingUiamKeyTag(
      context,
      ruleId,
      spaceId,
      getRuleData({
        uiamApiKey: null,
        tags: ['existing-tag', LEGACY_MISSING_UIAM_API_KEY_TAG],
      })
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      ruleId,
      expect.objectContaining({
        apiKey: mockedRawRuleSO.attributes.apiKey,
        tags: ['existing-tag', MISSING_UIAM_API_KEY_TAG],
      }),
      {
        mergeAttributes: false,
        namespace: spaceId,
        refresh: false,
        version: '1',
      }
    );
    expect(result.rawRule.tags).toEqual(['existing-tag', MISSING_UIAM_API_KEY_TAG]);
    expect(result.version).toBe('2');
  });

  test('removes missing UIAM API key tags when the key exists', async () => {
    const result = await updateRuleMissingUiamKeyTag(
      context,
      ruleId,
      spaceId,
      getRuleData({
        uiamApiKey: 'uiam-key',
        tags: [MISSING_UIAM_API_KEY_TAG, LEGACY_MISSING_UIAM_API_KEY_TAG, 'existing-tag'],
      })
    );

    expect(result.rawRule.tags).toEqual(['existing-tag']);
    expect(mockUpdate).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      ruleId,
      expect.objectContaining({ tags: ['existing-tag'], uiamApiKey: 'uiam-key' }),
      expect.objectContaining({ mergeAttributes: false, version: '1' })
    );
  });

  test('does not update the rule when its tags are unchanged', async () => {
    const ruleData = getRuleData({
      uiamApiKey: null,
      tags: ['existing-tag', MISSING_UIAM_API_KEY_TAG],
    });

    const result = await updateRuleMissingUiamKeyTag(context, ruleId, spaceId, ruleData);

    expect(result).toBe(ruleData);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('continues with the loaded rule when updating its tags fails', async () => {
    const ruleData = getRuleData({ uiamApiKey: null, tags: [] });
    mockUpdate.mockRejectedValueOnce(new Error('saved object update failed'));

    const result = await updateRuleMissingUiamKeyTag(context, ruleId, spaceId, ruleData);

    expect(result).toBe(ruleData);
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to update missing UIAM API key tags for rule ${ruleId}: saved object update failed`
    );
  });

  test('continues with the loaded rule when creating the saved objects client fails', async () => {
    const ruleData = getRuleData({ uiamApiKey: null, tags: [] });
    savedObjects.getUnsafeInternalClient.mockImplementationOnce(() => {
      throw new Error('saved objects client creation failed');
    });

    const result = await updateRuleMissingUiamKeyTag(context, ruleId, spaceId, ruleData);

    expect(result).toBe(ruleData);
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to update missing UIAM API key tags for rule ${ruleId}: saved objects client creation failed`
    );
  });
});
