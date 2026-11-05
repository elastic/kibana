/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  encodeApiKey,
  encodeUiamApiKey,
  getUiamApiKeyId,
  getUiamApiKeySecret,
  toEsApiKey,
  toUiamApiKey,
} from './api_keys';

const envelopedUiamKey = encodeApiKey('uiam-id', 'essu_secret');

describe('stored API keys', () => {
  it.each([
    ['a raw UIAM secret', 'essu_secret', 'essu_secret', undefined],
    ['an enveloped UIAM key', envelopedUiamKey, 'essu_secret', 'uiam-id'],
    ['an ES key', encodeApiKey('es-id', 'secret'), encodeApiKey('es-id', 'secret'), undefined],
  ])('reads the UIAM secret and id of %s', (_, stored, secret, id) => {
    expect(getUiamApiKeySecret(stored)).toBe(secret);
    expect(getUiamApiKeyId(stored)).toBe(id);
  });

  it('reads an ES key', () => {
    const encoded = encodeApiKey('es-id', 'secret');

    expect(toEsApiKey(encoded)).toEqual({ id: 'es-id', encoded });
    expect(toEsApiKey(encoded, 'stored-id')).toEqual({ id: 'stored-id', encoded });
  });

  it('reads and writes UIAM keys', () => {
    expect(toUiamApiKey(envelopedUiamKey)).toEqual({
      id: 'uiam-id',
      secret: 'essu_secret',
      external: false,
    });
    expect(toUiamApiKey('essu_secret', { id: 'stored-id', external: true })).toEqual({
      id: 'stored-id',
      secret: 'essu_secret',
      external: true,
    });
    expect(encodeUiamApiKey({ id: 'uiam-id', secret: 'essu_secret', external: false })).toBe(
      envelopedUiamKey
    );
    expect(encodeUiamApiKey({ secret: 'essu_secret', external: false })).toBe('essu_secret');
  });
});
