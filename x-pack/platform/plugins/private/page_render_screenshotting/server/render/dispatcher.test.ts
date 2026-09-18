/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDispatcherProvider } from './dispatcher';
import type { PluginConfig } from '../config';

const sslConfig = (overrides: Partial<PluginConfig['ssl']> = {}): PluginConfig['ssl'] => ({
  verificationMode: 'full',
  ...overrides,
});

describe('createDispatcherProvider', () => {
  // config/serverless.yml points at an ECP-only mount, but serverless FTR and Scout load
  // that file too -- reading at startup took Kibana down with ENOENT before it was available.
  it('does not read the certificate until a render asks for the dispatcher', () => {
    const provider = createDispatcherProvider(
      sslConfig({ certificate: '/mnt/elastic-internal/http-certs/tls.crt' })
    );

    expect(() => provider()).toThrow(/ENOENT/);
  });

  it('returns undefined when no custom TLS is configured', () => {
    expect(createDispatcherProvider(sslConfig())()).toBeUndefined();
  });

  it('reuses one agent across calls so renders share a connection pool', () => {
    const provider = createDispatcherProvider(sslConfig({ verificationMode: 'none' }));

    expect(provider()).toBe(provider());
  });
});
