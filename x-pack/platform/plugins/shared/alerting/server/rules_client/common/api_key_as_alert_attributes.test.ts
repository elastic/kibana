/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiKeyAsAlertAttributes,
  apiKeyAsRuleDomainProperties,
  shouldAddMissingUiamKeyTag,
  addMissingUiamKeyTagIfNeeded,
} from './api_key_as_alert_attributes';
import { MISSING_UIAM_API_KEY_TAG } from '../../application/rule/constants';
import { coreFeatureFlagsMock } from '@kbn/core/server/mocks';

describe('apiKeyAsAlertAttributes', () => {
  test('return attributes', () => {
    expect(
      apiKeyAsAlertAttributes(
        {
          apiKeysEnabled: true,
          result: {
            id: '123',
            name: '123',
            api_key: 'abc',
          },
        },
        'test',
        false
      )
    ).toEqual({
      apiKey: 'MTIzOmFiYw==',
      apiKeyOwner: 'test',
      apiKeyCreatedByUser: false,
    });
  });

  test('returns null attributes when api keys are not enabled', () => {
    expect(
      apiKeyAsAlertAttributes(
        {
          apiKeysEnabled: false,
        },
        'test',
        false
      )
    ).toEqual({
      apiKey: null,
      apiKeyOwner: null,
      apiKeyCreatedByUser: null,
    });
  });

  test('returns apiKeyCreatedByUser as true when createdByUser is passed in', () => {
    expect(
      apiKeyAsAlertAttributes(
        {
          apiKeysEnabled: true,
          result: {
            id: '123',
            name: '123',
            api_key: 'abc',
          },
        },
        'test',
        true
      )
    ).toEqual({
      apiKey: 'MTIzOmFiYw==',
      apiKeyOwner: 'test',
      apiKeyCreatedByUser: true,
    });
  });

  test('returns UIAM API Key as well', () => {
    expect(
      apiKeyAsRuleDomainProperties(
        {
          apiKeysEnabled: true,
          result: {
            id: '123',
            name: '123',
            api_key: 'abc',
          },
          uiamResult: {
            id: '456',
            name: '456',
            api_key: 'def',
          },
        },
        'test',
        false
      )
    ).toEqual({
      apiKey: 'MTIzOmFiYw==',
      apiKeyOwner: 'test',
      apiKeyCreatedByUser: false,
      uiamApiKey: 'NDU2OmRlZg==',
    });
  });

  test('returns only UIAM API Key when ES API Key is not provided', () => {
    expect(
      apiKeyAsRuleDomainProperties(
        {
          apiKeysEnabled: true,
          uiamResult: {
            id: '456',
            name: '456',
            api_key: 'def',
          },
        },
        'test',
        true
      )
    ).toEqual({
      apiKey: null,
      apiKeyOwner: 'test',
      apiKeyCreatedByUser: true,
      uiamApiKey: 'NDU2OmRlZg==',
    });
  });

  test('does not create both API keys when createdByUser is true', () => {
    expect(() =>
      apiKeyAsRuleDomainProperties(
        {
          apiKeysEnabled: true,
          result: {
            id: '123',
            name: '123',
            api_key: 'abc',
          },
          uiamResult: {
            id: '456',
            name: '456',
            api_key: 'def',
          },
        },
        'test',
        true
      )
    ).toThrow(
      'Both ES and UIAM API keys were created for a rule, but only one should be created when the API key is created by a user. This should never happen.'
    );
  });
});

const featureFlags = coreFeatureFlagsMock.createStart();

describe('shouldAddMissingUiamKeyTag', () => {
  test('returns true when all conditions are met: serverless, feature flag enabled, no uiamApiKey, apiKeyCreatedByUser is false', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(true);
    expect(await shouldAddMissingUiamKeyTag(null, false, true, featureFlags)).toBe(true);
  });

  test('returns true when uiamApiKey is undefined and other conditions are met', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(true);
    expect(await shouldAddMissingUiamKeyTag(undefined, false, true, featureFlags)).toBe(true);
  });

  test('returns false when not serverless', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(true);
    expect(await shouldAddMissingUiamKeyTag(null, false, false, featureFlags)).toBe(false);
  });

  test('returns false when feature flag is disabled', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(false);
    expect(await shouldAddMissingUiamKeyTag(null, false, true, featureFlags)).toBe(false);
  });

  test('returns false when uiamApiKey exists', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(true);
    expect(await shouldAddMissingUiamKeyTag('some-key', false, true, featureFlags)).toBe(false);
  });

  test('returns false when apiKeyCreatedByUser is true', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(true);
    expect(await shouldAddMissingUiamKeyTag(null, true, true, featureFlags)).toBe(false);
  });

  test('returns false when apiKeyCreatedByUser is null', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(true);
    expect(await shouldAddMissingUiamKeyTag(null, null, true, featureFlags)).toBe(false);
  });

  test('returns false when apiKeyCreatedByUser is undefined', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(true);
    expect(await shouldAddMissingUiamKeyTag(null, undefined, true, featureFlags)).toBe(false);
  });

  test('returns false when neither serverless nor feature flag are enabled', async () => {
    featureFlags.getBooleanValue.mockResolvedValue(false);
    expect(await shouldAddMissingUiamKeyTag(null, false, false, featureFlags)).toBe(false);
  });
});

describe('addMissingUiamKeyTagIfNeeded', () => {
  test('adds tag when all conditions are met', async () => {
    const tags = ['existing-tag'];
    featureFlags.getBooleanValue.mockResolvedValue(true);
    const result = await addMissingUiamKeyTagIfNeeded(tags, null, false, true, featureFlags);
    expect(result).toEqual(['existing-tag', MISSING_UIAM_API_KEY_TAG]);
  });

  test('does not add tag when not serverless', async () => {
    const tags = ['existing-tag'];
    featureFlags.getBooleanValue.mockResolvedValue(true);
    const result = await addMissingUiamKeyTagIfNeeded(tags, null, false, false, featureFlags);
    expect(result).toEqual(['existing-tag']);
  });

  test('does not add tag when feature flag is disabled', async () => {
    const tags = ['existing-tag'];
    featureFlags.getBooleanValue.mockResolvedValue(false);
    const result = await addMissingUiamKeyTagIfNeeded(tags, null, false, true, featureFlags);
    expect(result).toEqual(['existing-tag']);
  });

  test('does not add tag when uiamApiKey exists', async () => {
    const tags = ['existing-tag'];
    featureFlags.getBooleanValue.mockResolvedValue(true);
    const result = await addMissingUiamKeyTagIfNeeded(tags, 'some-key', false, true, featureFlags);
    expect(result).toEqual(['existing-tag']);
  });

  test('does not add tag when apiKeyCreatedByUser is true', async () => {
    const tags = ['existing-tag'];
    featureFlags.getBooleanValue.mockResolvedValue(true);
    const result = await addMissingUiamKeyTagIfNeeded(tags, null, true, true, featureFlags);
    expect(result).toEqual(['existing-tag']);
  });

  test('does not add duplicate tag if tag already exists', async () => {
    const tags = ['existing-tag', MISSING_UIAM_API_KEY_TAG];
    featureFlags.getBooleanValue.mockResolvedValue(true);
    const result = await addMissingUiamKeyTagIfNeeded(tags, null, false, true, featureFlags);
    expect(result).toEqual(['existing-tag', MISSING_UIAM_API_KEY_TAG]);
  });

  test('works with empty tags array', async () => {
    const tags: string[] = [];
    featureFlags.getBooleanValue.mockResolvedValue(true);
    const result = await addMissingUiamKeyTagIfNeeded(tags, null, false, true, featureFlags);
    expect(result).toEqual([MISSING_UIAM_API_KEY_TAG]);
  });

  test('does not mutate original tags array', async () => {
    const tags = ['existing-tag'];
    featureFlags.getBooleanValue.mockResolvedValue(true);
    const result = await addMissingUiamKeyTagIfNeeded(tags, null, false, true, featureFlags);
    expect(tags).toEqual(['existing-tag']);
    expect(result).not.toBe(tags);
  });
});
