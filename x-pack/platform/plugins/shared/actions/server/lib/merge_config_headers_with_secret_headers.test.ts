/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeConfigHeadersWithSecretHeaders } from './merge_config_headers_with_secret_headers';

describe('mergeConfigHeadersWithSecretHeaders', () => {
  it('merges config headers and secret headers correctly', () => {
    expect(
      mergeConfigHeadersWithSecretHeaders(
        { configKey: 'configValue' },
        { secretKey: 'secretValue' }
      )
    ).toEqual({
      configKey: 'configValue',
      secretKey: 'secretValue',
    });
  });
  it('merges config and secret headers correctly if the keys are the same', () => {
    expect(
      mergeConfigHeadersWithSecretHeaders({ key: 'configValue' }, { key: 'secretValue' })
    ).toEqual({
      key: 'secretValue',
    });
  });
  it('should return an empty object when both configHeaders and secretHeaders are null', () => {
    expect(mergeConfigHeadersWithSecretHeaders(null, null)).toEqual({});
  });
  it('should return an empty object when both configHeaders and secretHeaders are undefined', () => {
    expect(mergeConfigHeadersWithSecretHeaders(undefined, undefined)).toEqual({});
  });
  it('should return only secretHeaders when configHeaders is null', () => {
    expect(mergeConfigHeadersWithSecretHeaders(null, { secretKey: 'secretValue' })).toEqual({
      secretKey: 'secretValue',
    });
  });
  it('should return only secretHeaders when configHeaders is undefined', () => {
    expect(mergeConfigHeadersWithSecretHeaders(undefined, { secretKey: 'secretValue' })).toEqual({
      secretKey: 'secretValue',
    });
  });
  it('should return only configHeaders when secretHeaders is null', () => {
    expect(mergeConfigHeadersWithSecretHeaders({ configKey: 'configValue' }, null)).toEqual({
      configKey: 'configValue',
    });
  });
  it('should return only configHeaders when secretHeaders is undefined', () => {
    expect(mergeConfigHeadersWithSecretHeaders({ configKey: 'configValue' }, undefined)).toEqual({
      configKey: 'configValue',
    });
  });
});
