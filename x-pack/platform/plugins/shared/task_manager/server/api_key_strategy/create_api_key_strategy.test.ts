/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ApiKeyType } from '../config';
import { createApiKeyStrategy } from './create_api_key_strategy';
import { EsApiKeyStrategy } from './es_api_key_strategy';
import { EsAndUiamApiKeyStrategy } from './es_and_uiam_api_key_strategy';

describe('createApiKeyStrategy', () => {
  test('returns EsApiKeyStrategy when UIAM is not available', () => {
    const coreStart = coreMock.createStart();
    coreStart.security.authc.apiKeys.uiam = null as never;

    const strategy = createApiKeyStrategy(ApiKeyType.ES, coreStart.security);
    expect(strategy).toBeInstanceOf(EsApiKeyStrategy);
  });

  test('returns EsAndUiamApiKeyStrategy when UIAM is available', () => {
    const coreStart = coreMock.createStart();
    coreStart.security.authc.apiKeys.uiam = {
      grant: jest.fn(),
      invalidate: jest.fn(),
      convert: jest.fn(),
    } as never;

    const strategy = createApiKeyStrategy(ApiKeyType.ES, coreStart.security);
    expect(strategy).toBeInstanceOf(EsAndUiamApiKeyStrategy);
  });

  test('passes apiKeyType to EsAndUiamApiKeyStrategy', () => {
    const coreStart = coreMock.createStart();
    coreStart.security.authc.apiKeys.uiam = {
      grant: jest.fn(),
      invalidate: jest.fn(),
      convert: jest.fn(),
    } as never;

    const strategy = createApiKeyStrategy(ApiKeyType.UIAM, coreStart.security);
    expect(strategy.typeToUse).toBe(ApiKeyType.UIAM);
  });
});
