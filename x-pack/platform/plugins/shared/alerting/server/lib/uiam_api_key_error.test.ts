/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMissingUiamApiKeyMessage } from './uiam_api_key_error';

describe('isMissingUiamApiKeyMessage()', () => {
  // The text production actually produces, taken from `siem.*` runs in production eu-west-1. None of
  // these retain the structured Elasticsearch error, which is the reason a message matcher exists.
  const STRINGIFIED_RESPONSE_ERROR = [
    'security_exception',
    '\tCaused by:',
    '\t\tsecurity_exception: failed to authenticate cloud API key: [0x28D520]',
    '\tRoot causes:',
    '\t\tsecurity_exception: failed to authenticate cloud API key: [0x28D520]',
  ].join('\n');

  test('matches a stringified Elasticsearch error', () => {
    expect(isMissingUiamApiKeyMessage(STRINGIFIED_RESPONSE_ERROR)).toBe(true);
  });

  test('matches when a caller wrapped the error in its own message', () => {
    expect(
      isMissingUiamApiKeyMessage(
        `Error fetching rule execution settings: ResponseError: ${STRINGIFIED_RESPONSE_ERROR}`
      )
    ).toBe(true);
  });

  test('requires the full phrase, not just the code', () => {
    // A detection rule searching for authentication failures can put the bare code into its own
    // error text; re-granting a key off that would be wrong.
    expect(isMissingUiamApiKeyMessage('found 3 documents matching "0x28D520"')).toBe(false);
  });

  test('does not match the other UIAM API key rejections', () => {
    // Only APIKEY_MISSING is recoverable by re-granting; see UIAM_API_KEY_MISSING_CODE.
    expect(isMissingUiamApiKeyMessage('failed to authenticate cloud API key: [0xD38358]')).toBe(
      false
    );
    expect(isMissingUiamApiKeyMessage('failed to authenticate cloud API key: [0x8560B2]')).toBe(
      false
    );
  });

  test('does not match unrelated failures', () => {
    expect(isMissingUiamApiKeyMessage('')).toBe(false);
    expect(isMissingUiamApiKeyMessage('boom')).toBe(false);
  });
});
