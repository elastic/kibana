/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateBracketsInFieldNames, validateSettings } from './validate_stream';
import { MalformedStreamError } from '../errors/malformed_stream_error';

describe('validateBracketsInFieldNames', () => {
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
    expect(() => validateBracketsInFieldNames(stream as any)).not.toThrow();
  });

  it('should throw for an invalid field name in wired stream fields', () => {
    const stream = createWiredStream({
      ingest: { wired: { fields: { 'invalid[field]': { type: 'keyword' } } } },
    });
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
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should throw for an invalid field name in processing step', () => {
    const stream = createWiredStream({
      ingest: {
        processing: {
          steps: [
            {
              action: 'rename',
              from: 'source[invalid]',
              to: 'destination',
            },
          ],
        },
      },
    });
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should not throw for a valid classic stream', () => {
    const stream = createClassicStream({
      field_overrides: { 'valid.field': { type: 'keyword' } },
    });
    expect(() => validateBracketsInFieldNames(stream as any)).not.toThrow();
  });

  it('should throw for an invalid field name in classic stream field_overrides', () => {
    const stream = createClassicStream({
      field_overrides: { 'invalid[field]': { type: 'keyword' } },
    });
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should throw for an invalid field name in a nested processing step', () => {
    const stream = createWiredStream({
      ingest: {
        processing: {
          steps: [
            {
              where: {
                steps: [
                  {
                    action: 'rename',
                    from: 'source',
                    to: 'destination[invalid]',
                  },
                ],
              },
            },
          ],
        },
      },
    });
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });

  it('should throw for an invalid field name in a nested processing step condition', () => {
    const stream = createWiredStream({
      ingest: {
        processing: {
          steps: [
            {
              where: {
                steps: [
                  {
                    action: 'rename',
                    from: 'source',
                    to: 'destination',
                    where: { field: 'invalid[field]', eq: 'value' },
                  },
                ],
              },
            },
          ],
        },
      },
    });
    expect(() => validateBracketsInFieldNames(stream as any)).toThrow(MalformedStreamError);
  });
});

describe('validateSettings', () => {
  const createStream = (settings: any = {}) => ({
    ingest: {
      settings,
    },
  });

  it('should throw if validation fails for refresh_interval in serverless', () => {
    expect(() =>
      validateSettings(createStream({ 'index.refresh_interval': { value: '1s' } }) as any, true)
    ).toThrowErrorMatchingInlineSnapshot(
      `"index setting [index.refresh_interval=1s] should be either -1 or equal to or greater than 5s."`
    );
  });

  it('should allow valid refresh_interval in serverless', () => {
    expect(() =>
      validateSettings(createStream({ 'index.refresh_interval': { value: '5s' } }) as any, true)
    ).not.toThrow();
    expect(() =>
      validateSettings(createStream({ 'index.refresh_interval': { value: '10s' } }) as any, true)
    ).not.toThrow();
    expect(() =>
      validateSettings(createStream({ 'index.refresh_interval': { value: -1 } }) as any, true)
    ).not.toThrow();
  });

  it('should throw if non-allowed setting is present in serverless', () => {
    expect(() =>
      validateSettings(createStream({ 'index.number_of_shards': { value: 1 } }) as any, true)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Setting [index.number_of_shards] is not allowed in serverless"`
    );
  });

  it('should not validate settings in non-serverless', () => {
    expect(() =>
      validateSettings(createStream({ 'index.refresh_interval': { value: '1s' } }) as any, false)
    ).not.toThrow();
  });
});
