/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceKnownOriginals, restoreTokens } from './token_map';

describe('token map transformations', () => {
  const tokenMap = {
    SHORT_TOKEN: { original: 'secret', entityClass: 'ENTITY_NAME' },
    LONG_TOKEN: { original: 'secret value', entityClass: 'ENTITY_NAME' },
  };

  it('replaces longer originals first', () => {
    expect(replaceKnownOriginals('a secret value and secret', tokenMap)).toBe(
      'a LONG_TOKEN and SHORT_TOKEN'
    );
  });

  it('restores every occurrence of call-local tokens', () => {
    expect(restoreTokens('LONG_TOKEN then SHORT_TOKEN and SHORT_TOKEN', tokenMap)).toBe(
      'secret value then secret and secret'
    );
  });
});
