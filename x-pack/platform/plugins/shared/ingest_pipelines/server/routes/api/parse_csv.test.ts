/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PARSE_CSV_MAX_FILE_BYTES } from '../../../common/constants';
import { parseCsvBodySchema } from './parse_csv';

describe('parse_csv body schema', () => {
  it('accepts a CSV payload', () => {
    expect(() =>
      parseCsvBodySchema.validate({ file: 'source,copy\nfoo,bar', copyAction: 'copy' })
    ).not.toThrow();
  });

  it('bounds the file to a modest ceiling well below the global payload limit', () => {
    // A mapping CSV is small; keep the cap tight since the privilege check runs only after
    // the body is buffered. 10MB is plenty for any real CSV but avoids large allocations by
    // unprivileged callers.
    expect(PARSE_CSV_MAX_FILE_BYTES).toBe(10 * 1024 * 1024);

    // A file at that limit is too large to build as a string in a test, so assert the
    // schema's declared max length matches the constant instead.
    const fileSchema = parseCsvBodySchema.getSchema().describe().keys?.file;
    const metas: Array<Record<string, unknown>> = fileSchema?.metas ?? [];
    const maxLengthMeta = metas.find((meta) => 'x-oas-max-length' in meta);
    expect(maxLengthMeta?.['x-oas-max-length']).toBe(PARSE_CSV_MAX_FILE_BYTES);
  });

  it('rejects a file larger than the ceiling', () => {
    const tooLarge = 'a'.repeat(PARSE_CSV_MAX_FILE_BYTES + 1);
    expect(() => parseCsvBodySchema.validate({ file: tooLarge, copyAction: 'copy' })).toThrow(
      /maximum length/
    );
  });
});
