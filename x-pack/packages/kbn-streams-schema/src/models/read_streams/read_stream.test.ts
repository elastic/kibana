/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestReadStream } from '../../fixtures/ingest_read_stream';
import { wiredReadStream } from '../../fixtures/wired_read_stream';
import { readStreamDefinitonSchema } from './read_stream';

describe('ReadStream', () => {
  it('should successfully parse wiredReadStream', () => {
    expect(readStreamDefinitonSchema.parse(wiredReadStream)).toMatchSnapshot();
  });
  it('should successfully parse ingestReadStream', () => {
    expect(readStreamDefinitonSchema.parse(ingestReadStream)).toMatchSnapshot();
  });
});
