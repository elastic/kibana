/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiKeyAsAlertAttributes,
  apiKeyAsRuleDomainProperties,
} from './api_key_as_alert_attributes';

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
