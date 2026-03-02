/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('inference config schema', () => {
  it('requires replacements encryption key', () => {
    expect(() => configSchema.validate({})).toThrowErrorMatchingInlineSnapshot(
      `"[replacements.encryptionKey]: expected value of type [string] but got [undefined]"`
    );
  });

  it('accepts explicit replacements encryption key', () => {
    expect(
      configSchema.validate({
        replacements: { encryptionKey: 'my-explicit-replacements-encryption-key' },
      })
    ).toMatchObject({
      replacements: { encryptionKey: 'my-explicit-replacements-encryption-key' },
    });
  });
});
