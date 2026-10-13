/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitIngestTokenHashFromConfig } from './omit_ingest_token_hash';

describe('omitIngestTokenHashFromConfig', () => {
  it('strips ingestTokenHash and keeps other keys', () => {
    expect(
      omitIngestTokenHashFromConfig({ ingestTokenHash: 'a'.repeat(64), other: 'kept' })
    ).toEqual({ other: 'kept' });
  });

  it('returns an empty object when config is only the hash', () => {
    expect(omitIngestTokenHashFromConfig({ ingestTokenHash: 'a'.repeat(64) })).toEqual({});
  });

  it('returns undefined when config is undefined', () => {
    expect(omitIngestTokenHashFromConfig(undefined)).toBeUndefined();
  });
});
