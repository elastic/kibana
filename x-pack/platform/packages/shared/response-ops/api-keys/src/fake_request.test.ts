/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExternalUiamCredential } from '@kbn/core-security-server';
import { buildFakeRequest, toFakeRequest } from './fake_request';
import { encodeApiKey } from './stored_keys';

const ES_KEY = encodeApiKey('es-id', 'es-secret');
const UIAM_KEY = encodeApiKey('uiam-id', 'essu_secret');

describe('toFakeRequest', () => {
  test.each([
    ['uiam', { apiKey: ES_KEY, uiamApiKey: UIAM_KEY }, 'uiam_api_key', 'essu_secret', false],
    ['uiam', { apiKey: ES_KEY }, 'es_api_key', ES_KEY, true],
    ['es', { apiKey: ES_KEY, uiamApiKey: UIAM_KEY }, 'es_api_key', ES_KEY, false],
    ['es', { uiamApiKey: 'essu_raw' }, 'uiam_api_key', 'essu_raw', true],
  ] as const)('prefer %s with %j uses %s', (prefer, stored, credentialType, apiKey, fellBack) => {
    const result = toFakeRequest(stored, { spaceId: 'space-a', prefer });

    expect(result).toMatchObject({ credentialType, apiKey, fellBack });
    expect(result.request.headers.authorization).toBe(`ApiKey ${apiKey}`);
    expect(result.request.spaceId).toBe('space-a');
  });

  test('has no authorization header without stored keys', () => {
    const result = toFakeRequest({}, { spaceId: 'default', prefer: 'es' });

    expect(result).toMatchObject({ credentialType: 'none', apiKey: null, fellBack: false });
    expect(result.request.headers.authorization).toBeUndefined();
  });

  test('marks an external UIAM credential', () => {
    const { request } = toFakeRequest(
      { uiamApiKey: 'essu_raw', uiamApiKeyExternal: true },
      { spaceId: 'default', prefer: 'uiam' }
    );

    expect(isExternalUiamCredential(request)).toBe(true);
  });

  test('does not mark an ES credential, even when the UIAM key is external', () => {
    const { request } = toFakeRequest(
      { apiKey: ES_KEY, uiamApiKey: 'essu_raw', uiamApiKeyExternal: true },
      { spaceId: 'default', prefer: 'es' }
    );

    expect(isExternalUiamCredential(request)).toBe(false);
  });

  test('marks an external UIAM key stored in the ES slot', () => {
    const { request } = toFakeRequest(
      { apiKey: UIAM_KEY, uiamApiKeyExternal: true },
      { spaceId: 'default', prefer: 'es' }
    );

    expect(request.headers.authorization).toBe(`ApiKey ${UIAM_KEY}`);
    expect(isExternalUiamCredential(request)).toBe(true);
  });
});

describe('buildFakeRequest', () => {
  test.each([
    ['a raw UIAM key', 'essu_raw', true, true],
    ['an encoded UIAM key', UIAM_KEY, true, true],
    ['an ES key', ES_KEY, true, false],
    ['a UIAM key without the external flag', 'essu_raw', undefined, false],
  ])('marks %s as external: %s -> %s', (_title, credential, external, marked) => {
    const request = buildFakeRequest(credential, { spaceId: 'space-a', external });

    expect(request.headers.authorization).toBe(`ApiKey ${credential}`);
    expect(request.spaceId).toBe('space-a');
    expect(isExternalUiamCredential(request)).toBe(marked);
  });

  test('has no authorization header without a credential', () => {
    const request = buildFakeRequest(undefined, { spaceId: 'default', external: true });

    expect(request.headers.authorization).toBeUndefined();
    expect(isExternalUiamCredential(request)).toBe(false);
  });
});
