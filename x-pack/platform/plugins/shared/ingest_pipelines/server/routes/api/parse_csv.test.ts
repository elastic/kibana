/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ABSOLUTE_MAX_FILE_SIZE_BYTES } from '@kbn/file-upload-common';

import { parseCsvBodySchema, parseCsvMaxFileBytes } from './parse_csv';

describe('parse_csv body schema', () => {
  it('accepts a CSV payload', () => {
    expect(() =>
      parseCsvBodySchema.validate({ file: 'source,copy\nfoo,bar', copyAction: 'copy' })
    ).not.toThrow();
  });

  it('uses the same file-size ceiling for the HTTP payload limit and schema maxLength', () => {
    expect(parseCsvMaxFileBytes).toBe(ABSOLUTE_MAX_FILE_SIZE_BYTES);

    // A file at that limit is too large to build as a string in a test, so assert the
    // schema's declared max length matches the shared constant instead.
    const fileSchema = parseCsvBodySchema.getSchema().describe().keys?.file;
    const metas: Array<Record<string, unknown>> = fileSchema?.metas ?? [];
    const maxLengthMeta = metas.find((meta) => 'x-oas-max-length' in meta);
    expect(maxLengthMeta?.['x-oas-max-length']).toBe(parseCsvMaxFileBytes);
  });
});
