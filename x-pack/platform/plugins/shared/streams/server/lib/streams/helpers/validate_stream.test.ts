/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateBracketsInFieldNames } from './validate_stream';
import { MalformedStreamError } from '../errors/malformed_stream_error';

describe('validateBracketsInFieldNames', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createWiredStream = (overrides: any = {}) => ({
    ingest: {
      processing: { steps: [] },
      ...overrides.ingest,
      wired: {
        fields: {},
        routing: [],
        ...overrides.ingest?.wired,
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createClassicStream = (overrides: any = {}) => ({
    ingest: {
      classic: {
        ...overrides,
      },
    },
  });

  it('should not throw for a valid wired stream', () => {
    const stream = createWiredStream({
      ingest: {
        wired: {
          fields: { 'valid.field': { type: 'keyword' } },
          routing: [{ destination: 'a', where: { field: 'another.valid.field', eq: 'value' } }],
        },
        processing: {
          steps: [
            {
              action: 'rename',
              from: 'source',
              to: 'destination',
            },
          ],
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).not.toThrow();
  });

  it('should throw for an invalid field name in wired stream fields', () => {
    const stream = createWiredStream({
      ingest: { wired: { fields: { 'invalid[field]': { type: 'keyword' } } } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should throw for an invalid field name in wired stream routing', () => {
    const stream = createWiredStream({
      ingest: {
        wired: {
          routing: [{ destination: 'a', where: { field: 'invalid[field]', eq: 'value' } }],
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should not throw for a valid classic stream', () => {
    const stream = createClassicStream({
      field_overrides: { 'valid.field': { type: 'keyword' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).not.toThrow();
  });

  it('should throw for an invalid field name in classic stream field_overrides', () => {
    const stream = createClassicStream({
      field_overrides: { 'invalid[field]': { type: 'keyword' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });
});
