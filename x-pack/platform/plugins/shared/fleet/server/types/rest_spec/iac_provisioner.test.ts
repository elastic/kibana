/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RenderIacTemplateResponseSchema } from './iac_provisioner';

describe('RenderIacTemplateResponseSchema', () => {
  const base = { artifactUrl: 'https://s3.example/x', expiresAt: '2026-01-01T00:00:00Z' };

  it('accepts a response carrying the template key', () => {
    expect(() =>
      RenderIacTemplateResponseSchema.validate({ ...base, key: 'sha256:abc' })
    ).not.toThrow();
  });

  it('still accepts a response without a key (provider predates it)', () => {
    expect(() => RenderIacTemplateResponseSchema.validate(base)).not.toThrow();
  });
});
