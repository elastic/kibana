/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExternalUiamCredential } from '@kbn/core-security-server';
import { encodeApiKey } from '../store/api_keys';
import { buildFakeRequest, pickCredential, toFakeRequest } from './fake_request';

const es = { id: 'es-id', encoded: encodeApiKey('es-id', 'secret') };
const uiam = { id: 'uiam-id', secret: 'essu_secret', external: true };

describe('pickCredential', () => {
  it('picks the preferred credential', () => {
    expect(pickCredential({ createdByUser: false, es, uiam }, 'es')).toEqual({
      credentialType: 'es_api_key',
      apiKey: es.encoded,
      fellBack: false,
    });
    expect(pickCredential({ createdByUser: false, es, uiam }, 'uiam')).toEqual({
      credentialType: 'uiam_api_key',
      apiKey: uiam.secret,
      fellBack: false,
    });
  });

  it('falls back to the other credential', () => {
    expect(pickCredential({ createdByUser: false, es }, 'uiam')).toEqual({
      credentialType: 'es_api_key',
      apiKey: es.encoded,
      fellBack: true,
    });
  });

  it('returns no credential without keys', () => {
    expect(pickCredential(undefined, 'uiam')).toEqual({
      credentialType: 'none',
      apiKey: null,
      fellBack: false,
    });
  });
});

describe('buildFakeRequest', () => {
  it('authenticates with the credential in the given space', () => {
    const request = buildFakeRequest(es.encoded, { spaceId: 'space-1' });

    expect(request.headers.authorization).toBe(`ApiKey ${es.encoded}`);
    expect(request.isFakeRequest).toBe(true);
  });

  it('has no authorization header without a credential', () => {
    expect(buildFakeRequest(null).headers.authorization).toBeUndefined();
  });

  it.each([
    ['a raw UIAM key', 'essu_secret', true],
    ['an enveloped UIAM key', encodeApiKey('uiam-id', 'essu_secret'), true],
    ['an ES key', es.encoded, false],
  ])('marks %s as external only when asked', (_, credential, marked) => {
    expect(isExternalUiamCredential(buildFakeRequest(credential, { external: true }))).toBe(marked);
    expect(isExternalUiamCredential(buildFakeRequest(credential))).toBe(false);
  });
});

describe('toFakeRequest', () => {
  it('marks the request external when the picked UIAM key is external', () => {
    const { request, credentialType } = toFakeRequest(
      { createdByUser: true, es, uiam },
      { prefer: 'uiam' }
    );

    expect(credentialType).toBe('uiam_api_key');
    expect(isExternalUiamCredential(request)).toBe(true);
  });

  it('does not mark the request when it falls back to the ES key', () => {
    const { request } = toFakeRequest({ createdByUser: true, es, uiam }, { prefer: 'es' });

    expect(isExternalUiamCredential(request)).toBe(false);
  });
});
