/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExternalUiamCredential } from '@kbn/core-security-server';

import {
  buildEventScheduleRequest,
  resolveConnectorEventScheduleRequest,
} from './build_event_fake_request';
import { encodeApiKey } from './encode_api_key';

describe('buildEventScheduleRequest', () => {
  test('puts the ES apiKey on Authorization', () => {
    const apiKey = encodeApiKey('es-id', 'es-secret')!;
    const request = buildEventScheduleRequest({ apiKey }, 'default');

    expect(request.headers.authorization).toBe(`ApiKey ${apiKey}`);
    expect(isExternalUiamCredential(request)).toBe(false);
  });

  test('unwraps an encoded UIAM key to the raw essu_ secret', () => {
    const uiamApiKey = encodeApiKey('uiam-id', 'essu_granted')!;
    const request = buildEventScheduleRequest({ uiamApiKey }, 'sales');

    expect(request.headers.authorization).toBe('ApiKey essu_granted');
  });

  test('prefers UIAM over ES when both are present', () => {
    const apiKey = encodeApiKey('es-id', 'es-secret')!;
    const uiamApiKey = encodeApiKey('uiam-id', 'essu_granted')!;
    const request = buildEventScheduleRequest({ apiKey, uiamApiKey }, 'default');

    expect(request.headers.authorization).toBe('ApiKey essu_granted');
  });

  test('marks an external UIAM credential', () => {
    const request = buildEventScheduleRequest(
      { uiamApiKey: 'essu_user_created_key', uiamApiKeyExternal: true },
      'default'
    );

    expect(request.headers.authorization).toBe('ApiKey essu_user_created_key');
    expect(isExternalUiamCredential(request)).toBe(true);
  });
});

describe('resolveConnectorEventScheduleRequest', () => {
  test('returns undefined when the connector has no identity', () => {
    expect(
      resolveConnectorEventScheduleRequest(
        {
          actionTypeId: '.inboundWebhook',
          name: 'ingress',
          isMissingSecrets: false,
          config: {},
          secrets: {},
        },
        'default'
      )
    ).toBeUndefined();
  });

  test('builds a request from the stored apiKey', () => {
    const apiKey = encodeApiKey('es-id', 'es-secret')!;
    const request = resolveConnectorEventScheduleRequest(
      {
        actionTypeId: '.inboundWebhook',
        name: 'ingress',
        isMissingSecrets: false,
        config: {},
        secrets: {},
        apiKey,
      },
      'default'
    );

    expect(request?.headers.authorization).toBe(`ApiKey ${apiKey}`);
  });
});
