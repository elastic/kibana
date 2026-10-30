/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatEnvPrefix } from './run';

describe('formatEnvPrefix', () => {
  it('redacts the tracing cluster URL, which can carry credentials', () => {
    const preview = formatEnvPrefix(
      { TRACING_ES_URL: 'https://elastic:secret@tracing.example.com:9243', EVAL_SUITE_ID: 'ab' },
      new Set()
    );

    expect(preview).toContain('TRACING_ES_URL=[redacted]');
    expect(preview).toContain('EVAL_SUITE_ID=ab');
    expect(preview).not.toContain('tracing.example.com');
    expect(preview).not.toContain('secret');
  });

  it('redacts exporters, credentials and suite-provided keys', () => {
    const preview = formatEnvPrefix(
      { TRACING_EXPORTERS: '[]', GCS_CREDENTIALS: '{}', SUITE_KEY: 'v' },
      new Set(['SUITE_KEY'])
    );

    expect(preview).toBe(
      'TRACING_EXPORTERS=[redacted] GCS_CREDENTIALS=[redacted] SUITE_KEY=[redacted]'
    );
  });
});
