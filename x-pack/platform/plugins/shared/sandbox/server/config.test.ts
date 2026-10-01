/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('sandbox config schema', () => {
  const validate = (ssl: Record<string, string>) => config.schema.validate({ ssl });

  it('accepts certificate and key together, or neither', () => {
    expect(() => validate({ certificate: '/tls.crt', key: '/tls.key' })).not.toThrow();
    expect(() => validate({ certificate_authorities: '/ca.crt' })).not.toThrow();
    expect(() => validate({})).not.toThrow();
  });

  it('rejects a certificate without a key', () => {
    expect(() => validate({ certificate: '/tls.crt' })).toThrow(
      'must specify [xpack.sandbox.ssl.key] when [xpack.sandbox.ssl.certificate] is specified'
    );
  });

  it('rejects a key without a certificate', () => {
    expect(() => validate({ key: '/tls.key' })).toThrow(
      'must specify [xpack.sandbox.ssl.certificate] when [xpack.sandbox.ssl.key] is specified'
    );
  });
});
