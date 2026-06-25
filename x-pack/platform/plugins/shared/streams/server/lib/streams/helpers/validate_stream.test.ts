/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition, Streams } from '@kbn/streams-schema';
import { validateBracketsInFieldNames, validateRootStreamChanges } from './validate_stream';
import { MalformedStreamError } from '../errors/malformed_stream_error';
import { RootStreamImmutabilityError } from '../errors/root_stream_immutability_error';

describe('validateRootStreamChanges', () => {
  const makeRootStream = ({
    fields = {},
    ...ingest
  }: Partial<Omit<Streams.WiredStream.Definition['ingest'], 'wired'>> & {
    fields?: FieldDefinition;
  } = {}): Streams.WiredStream.Definition => ({
    type: 'wired',
    name: 'logs.ecs',
    description: '',
    updated_at: '2024-01-01T00:00:00Z',
    ingest: {
      lifecycle: { dsl: {} },
      processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
      settings: {},
      failure_store: { disabled: {} },
      wired: { fields, routing: [] },
      ...ingest,
    },
  });

  describe('field immutability', () => {
    it('should not throw when nothing changes', () => {
      const stream = makeRootStream({ fields: { 'host.name': { type: 'keyword' } } });
      expect(() => validateRootStreamChanges(stream, stream)).not.toThrow();
    });

    it('should not throw when only the description of a base field changes', () => {
      const current = makeRootStream({ fields: { 'host.name': { type: 'keyword' } } });
      const next = makeRootStream({
        fields: { 'host.name': { type: 'keyword', description: 'updated description' } },
      });
      expect(() => validateRootStreamChanges(current, next)).not.toThrow();
    });

    it('should throw when the type of a base field changes', () => {
      const current = makeRootStream({ fields: { 'host.name': { type: 'keyword' } } });
      const next = makeRootStream({ fields: { 'host.name': { type: 'text' } } });
      expect(() => validateRootStreamChanges(current, next)).toThrow(RootStreamImmutabilityError);
    });

    it('should not throw when a non-base field changes', () => {
      const current = makeRootStream();
      const next = makeRootStream({ fields: { custom_field: { type: 'text' } } });
      expect(() => validateRootStreamChanges(current, next)).not.toThrow();
    });
  });

  describe('lifecycle', () => {
    it('should throw when the next lifecycle is inherit', () => {
      const current = makeRootStream();
      const next = makeRootStream({ lifecycle: { inherit: {} } });
      expect(() => validateRootStreamChanges(current, next)).toThrow(MalformedStreamError);
    });

    it('should not throw when the next lifecycle is not inherit', () => {
      const current = makeRootStream();
      const next = makeRootStream({ lifecycle: { dsl: { data_retention: '7d' } } });
      expect(() => validateRootStreamChanges(current, next)).not.toThrow();
    });
  });

  describe('failure store', () => {
    it('should throw when the next failure store is inherit', () => {
      const current = makeRootStream();
      const next = makeRootStream({ failure_store: { inherit: {} } });
      expect(() => validateRootStreamChanges(current, next)).toThrow(MalformedStreamError);
    });

    it('should not throw when the next failure store is not inherit', () => {
      const current = makeRootStream();
      const next = makeRootStream({ failure_store: { disabled: {} } });
      expect(() => validateRootStreamChanges(current, next)).not.toThrow();
    });
  });
});

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
