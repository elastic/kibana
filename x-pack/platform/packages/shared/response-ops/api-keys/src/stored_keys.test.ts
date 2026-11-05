/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeApiKey,
  encodeApiKey,
  getInvalidationTargets,
  getUiamApiKeyId,
  getUiamApiKeySecret,
} from './stored_keys';

const ES_KEY = encodeApiKey('es-id', 'es-secret');
const UIAM_KEY = encodeApiKey('uiam-id', 'essu_secret');

describe('encodeApiKey / decodeApiKey', () => {
  test('round-trips id and secret', () => {
    expect(decodeApiKey(ES_KEY)).toEqual({ id: 'es-id', secret: 'es-secret' });
  });

  test('keeps only the first secret segment', () => {
    expect(decodeApiKey(encodeApiKey('id', 'sec:ret'))).toEqual({ id: 'id', secret: 'sec' });
  });
});

describe('getUiamApiKeySecret', () => {
  test.each([
    ['a raw essu_ secret', 'essu_raw', 'essu_raw'],
    ['a base64(id:essu_) envelope', UIAM_KEY, 'essu_secret'],
    ['an ES key', ES_KEY, ES_KEY],
    ['a value that is neither', '!!!not-base64!!!', '!!!not-base64!!!'],
  ])('returns the right value for %s', (_, stored, expected) => {
    expect(getUiamApiKeySecret(stored)).toBe(expected);
  });
});

describe('getUiamApiKeyId', () => {
  test.each([
    ['a base64(id:essu_) envelope', UIAM_KEY, 'uiam-id'],
    ['a raw essu_ secret', 'essu_raw', undefined],
    ['an ES key', ES_KEY, undefined],
    ['nothing', undefined, undefined],
    ['null', null, undefined],
    ['an empty string', '', undefined],
  ])('returns the right id for %s', (_, stored, expected) => {
    expect(getUiamApiKeyId(stored)).toBe(expected);
  });
});

describe('getInvalidationTargets', () => {
  test('targets the ES and UIAM keys Kibana granted', () => {
    expect(getInvalidationTargets({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY })).toEqual([
      { apiKeyId: 'es-id' },
      { apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' },
    ]);
  });

  test('targets nothing for user-created keys', () => {
    expect(
      getInvalidationTargets({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: true })
    ).toEqual([]);
  });

  test('uses the stored UIAM key id with the stored value as-is', () => {
    expect(getInvalidationTargets({ uiamApiKey: 'essu_raw', uiamApiKeyId: 'uiam-id' })).toEqual([
      { apiKeyId: 'uiam-id', uiamApiKey: 'essu_raw' },
    ]);
  });

  test('skips a raw essu_ secret without a stored id', () => {
    expect(getInvalidationTargets({ apiKey: 'essu_raw', uiamApiKey: 'essu_raw' })).toEqual([]);
  });

  test('detects a UIAM key stored in the apiKey field', () => {
    expect(getInvalidationTargets({ apiKey: UIAM_KEY })).toEqual([
      { apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' },
    ]);
  });
});
