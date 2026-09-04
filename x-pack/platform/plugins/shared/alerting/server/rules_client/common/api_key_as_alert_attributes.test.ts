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
      uiamApiKeyExternal: false,
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
      uiamApiKeyExternal: false,
    });
  });

  test('stores the raw UIAM API key as-is when it has no id and is created by the user', () => {
    expect(
      apiKeyAsRuleDomainProperties(
        {
          apiKeysEnabled: true,
          uiamResult: {
            name: 'uiam-test',
            api_key: 'essu_user_created_key',
          },
        },
        'test',
        true
      )
    ).toEqual({
      apiKey: null,
      apiKeyOwner: 'test',
      apiKeyCreatedByUser: true,
      uiamApiKey: 'essu_user_created_key',
      uiamApiKeyExternal: false,
    });
  });

  test('persists uiamApiKeyExternal when UIAM reported the key as external', () => {
    expect(
      apiKeyAsRuleDomainProperties(
        {
          apiKeysEnabled: true,
          uiamResult: {
            name: 'uiam-test',
            api_key: 'essu_user_created_key',
            external: true,
          },
        },
        'test',
        true
      )
    ).toEqual({
      apiKey: null,
      apiKeyOwner: 'test',
      apiKeyCreatedByUser: true,
      uiamApiKey: 'essu_user_created_key',
      uiamApiKeyExternal: true,
    });
  });

  test('writes uiamApiKeyExternal: false alongside an internal key so a stale true cannot survive', () => {
    // `updateRuleApiKey` and `enableRule` persist through a partial saved-object update, which
    // merges: omitting the attribute would leave a previously stored `true` in place and the run
    // would then withhold the UIAM shared secret from this freshly granted internal key.
    const properties = apiKeyAsRuleDomainProperties(
      {
        apiKeysEnabled: true,
        uiamResult: { id: '456', name: '456', api_key: 'def' },
      },
      'test',
      false
    );

    expect(properties.uiamApiKeyExternal).toBe(false);
  });

  test('does not store a UIAM API key without an id when it is not created by the user', () => {
    expect(
      apiKeyAsRuleDomainProperties(
        {
          apiKeysEnabled: true,
          uiamResult: {
            name: 'uiam-test',
            api_key: 'essu_framework_key_without_id',
          },
        },
        'test',
        false
      )
    ).toEqual({
      apiKey: null,
      apiKeyOwner: 'test',
      apiKeyCreatedByUser: false,
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

describe('shouldAddMissingUiamKeyTag', () => {
  test('returns true when all conditions are met: serverless, UIAM granted, no uiamApiKey', () => {
    expect(shouldAddMissingUiamKeyTag(null, true, true)).toBe(true);
  });

  test('returns true when uiamApiKey is undefined and other conditions are met', () => {
    expect(shouldAddMissingUiamKeyTag(undefined, true, true)).toBe(true);
  });

  test('returns false when not serverless', () => {
    expect(shouldAddMissingUiamKeyTag(null, false, true)).toBe(false);
  });

  test('returns false when uiamApiKey exists', () => {
    expect(shouldAddMissingUiamKeyTag('some-key', true, true)).toBe(false);
  });

  test('returns false when UIAM keys are not granted in this deployment', () => {
    expect(shouldAddMissingUiamKeyTag(null, true, false)).toBe(false);
  });

  test('returns false when shouldGrantUiam is undefined', () => {
    expect(shouldAddMissingUiamKeyTag(null, true, undefined)).toBe(false);
  });
});

describe('addMissingUiamKeyTagIfNeeded', () => {
  test('adds tag when all conditions are met', () => {
    const tags = ['existing-tag'];
    expect(addMissingUiamKeyTagIfNeeded(tags, null, true, true)).toEqual([
      'existing-tag',
      MISSING_UIAM_API_KEY_TAG,
    ]);
  });

  test('does not add tag when not serverless', () => {
    const tags = ['existing-tag'];
    expect(addMissingUiamKeyTagIfNeeded(tags, null, false, true)).toEqual(['existing-tag']);
  });

  test('does not add tag when uiamApiKey exists', () => {
    const tags = ['existing-tag'];
    expect(addMissingUiamKeyTagIfNeeded(tags, 'some-key', true, true)).toEqual(['existing-tag']);
  });

  test('does not add tag when UIAM keys are not granted in this deployment', () => {
    const tags = ['existing-tag'];
    expect(addMissingUiamKeyTagIfNeeded(tags, null, true, false)).toEqual(['existing-tag']);
  });

  test('does not add duplicate tag if tag already exists', () => {
    const tags = ['existing-tag', MISSING_UIAM_API_KEY_TAG];
    expect(addMissingUiamKeyTagIfNeeded(tags, null, true, true)).toEqual([
      'existing-tag',
      MISSING_UIAM_API_KEY_TAG,
    ]);
  });

  test('works with empty tags array', () => {
    const tags: string[] = [];
    expect(addMissingUiamKeyTagIfNeeded(tags, null, true, true)).toEqual([
      MISSING_UIAM_API_KEY_TAG,
    ]);
  });

  test('does not mutate original tags array', () => {
    const tags = ['existing-tag'];
    const result = addMissingUiamKeyTagIfNeeded(tags, null, true, true);
    expect(tags).toEqual(['existing-tag']);
    expect(result).not.toBe(tags);
  });
});
