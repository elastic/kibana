/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiKeyAsAlertAttributes } from './api_key_as_alert_attributes';

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
});
