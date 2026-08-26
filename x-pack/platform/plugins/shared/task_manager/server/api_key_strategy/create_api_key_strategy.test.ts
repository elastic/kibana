/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ApiKeyType } from '../config';
import { createApiKeyStrategy } from './create_api_key_strategy';
import { EsApiKeyStrategy } from './es_api_key_strategy';
import { EsAndUiamApiKeyStrategy } from './es_and_uiam_api_key_strategy';

describe('createApiKeyStrategy', () => {
  const logger = loggingSystemMock.createLogger();

  const uiamAvailable = () => {
    const coreStart = coreMock.createStart();
    coreStart.security.authc.apiKeys.uiam = {
      grant: jest.fn(),
      invalidate: jest.fn(),
      convert: jest.fn(),
    } as never;
    return coreStart;
  };

  test('returns EsApiKeyStrategy when UIAM is not available', () => {
    const coreStart = coreMock.createStart();
    coreStart.security.authc.apiKeys.uiam = null as never;

    const strategy = createApiKeyStrategy(ApiKeyType.ES, true, coreStart.security, logger);
    expect(strategy).toBeInstanceOf(EsApiKeyStrategy);
  });

  test('returns EsApiKeyStrategy when UIAM is available but grantUiamApiKeys is false', () => {
    const coreStart = uiamAvailable();

    const strategy = createApiKeyStrategy(ApiKeyType.ES, false, coreStart.security, logger);
    expect(strategy).toBeInstanceOf(EsApiKeyStrategy);
  });

  test('returns EsApiKeyStrategy when UIAM is available, grantUiamApiKeys is false, even if api_key_type is uiam', () => {
    const coreStart = uiamAvailable();

    const strategy = createApiKeyStrategy(ApiKeyType.UIAM, false, coreStart.security, logger);
    expect(strategy).toBeInstanceOf(EsApiKeyStrategy);
  });

  test('returns EsAndUiamApiKeyStrategy when UIAM is available and grantUiamApiKeys is true', () => {
    const coreStart = uiamAvailable();

    const strategy = createApiKeyStrategy(ApiKeyType.ES, true, coreStart.security, logger);
    expect(strategy).toBeInstanceOf(EsAndUiamApiKeyStrategy);
  });

  test('passes apiKeyType to EsAndUiamApiKeyStrategy', () => {
    const coreStart = uiamAvailable();

    const strategy = createApiKeyStrategy(ApiKeyType.UIAM, true, coreStart.security, logger);
    expect(strategy.typeToUse).toBe(ApiKeyType.UIAM);
  });
});
