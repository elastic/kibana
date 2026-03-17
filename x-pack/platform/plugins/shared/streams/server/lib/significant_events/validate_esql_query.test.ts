/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { validateEsqlQueryForStreamOrThrow, EsqlQueryValidationError } from './validate_esql_query';

jest.mock('@elastic/esql', () => {
  const actual = jest.requireActual('@elastic/esql');
  return {
    ...actual,
    Parser: {
      ...actual.Parser,
      parse: jest.fn(actual.Parser.parse),
    },
  };
});

const createWiredStreamDefinition = (name: string): Streams.WiredStream.Definition => ({
  name,
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    failure_store: { inherit: {} },
    wired: {
      fields: {},
      routing: [],
    },
  },
});

const createClassicStreamDefinition = (name: string): Streams.ClassicStream.Definition =>
  ({
    name,
    description: '',
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      failure_store: { inherit: {} },
      classic: {
        field_overrides: {},
      },
    },
  } as Streams.ClassicStream.Definition);

describe('validateEsqlQueryForStreamOrThrow', () => {
  describe('parsing errors', () => {
    it('should throw for syntactically invalid ES|QL', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({ esqlQuery: '{{INVALID ESQL}}', stream })
      ).rejects.toThrow(EsqlQueryValidationError);
    });

    it('should include "Invalid ES|QL query" in the error message for unparseable input', async () => {
      const { Parser } = jest.requireMock('@elastic/esql');
      (Parser.parse as jest.Mock).mockImplementationOnce(() => {
        throw new Error('parse failure');
      });

      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({ esqlQuery: 'anything', stream })
      ).rejects.toThrow('Invalid ES|QL query: parse failure');
    });

    it('should set statusCode to 400', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({ esqlQuery: '{{INVALID ESQL}}', stream })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('FROM clause validation', () => {
    it('should throw when FROM clause is missing', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({ esqlQuery: 'SHOW INFO', stream })
      ).rejects.toThrow('ES|QL query must contain a FROM clause');
    });

    it('should throw when FROM clause has no sources', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({ esqlQuery: 'FROM | LIMIT 10', stream })
      ).rejects.toThrow(EsqlQueryValidationError);
    });
  });

  describe('source validation for wired streams', () => {
    it('should accept FROM name, name.*', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs, logs.* METADATA _id, _source',
          stream,
        })
      ).resolves.toBeUndefined();
    });

    it('should reject FROM name.*, name (reversed order)', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs.*, logs METADATA _id, _source',
          stream,
        })
      ).rejects.toThrow('ES|QL query must use FROM logs, logs.*');
    });

    it('should reject FROM with only the stream name', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs METADATA _id, _source',
          stream,
        })
      ).rejects.toThrow('ES|QL query must use FROM logs, logs.*');
    });

    it('should reject FROM with only the wildcard pattern', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs.* METADATA _id, _source',
          stream,
        })
      ).rejects.toThrow('ES|QL query must use FROM logs, logs.*');
    });

    it('should reject FROM with an unrelated source', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM metrics, metrics.* METADATA _id, _source',
          stream,
        })
      ).rejects.toThrow('ES|QL query must use FROM logs, logs.*');
    });
  });

  describe('source validation for classic streams', () => {
    it('should accept FROM with only the stream name', async () => {
      const stream = createClassicStreamDefinition('metrics-custom');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM metrics-custom METADATA _id, _source',
          stream,
        })
      ).resolves.toBeUndefined();
    });

    it('should accept FROM name, name.*', async () => {
      const stream = createClassicStreamDefinition('metrics-custom');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM metrics-custom, metrics-custom.* METADATA _id, _source',
          stream,
        })
      ).resolves.toBeUndefined();
    });

    it('should reject FROM with only the wildcard pattern', async () => {
      const stream = createClassicStreamDefinition('metrics-custom');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM metrics-custom.* METADATA _id, _source',
          stream,
        })
      ).rejects.toThrow(
        'ES|QL query must use FROM metrics-custom or FROM metrics-custom, metrics-custom.*'
      );
    });

    it('should reject FROM with an unrelated source', async () => {
      const stream = createClassicStreamDefinition('metrics-custom');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs METADATA _id, _source',
          stream,
        })
      ).rejects.toThrow(
        'ES|QL query must use FROM metrics-custom or FROM metrics-custom, metrics-custom.*'
      );
    });
  });

  describe('METADATA validation', () => {
    it('should throw when METADATA is missing entirely', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs, logs.*',
          stream,
        })
      ).rejects.toThrow('ES|QL query METADATA must include both `_id` and `_source`');
    });

    it('should throw when _id is missing from METADATA', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs, logs.* METADATA _source',
          stream,
        })
      ).rejects.toThrow('ES|QL query METADATA must include both `_id` and `_source`');
    });

    it('should throw when _source is missing from METADATA', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs, logs.* METADATA _id',
          stream,
        })
      ).rejects.toThrow('ES|QL query METADATA must include both `_id` and `_source`');
    });

    it('should accept METADATA with both _id and _source', async () => {
      const stream = createWiredStreamDefinition('logs');

      await expect(
        validateEsqlQueryForStreamOrThrow({
          esqlQuery: 'FROM logs, logs.* METADATA _id, _source',
          stream,
        })
      ).resolves.toBeUndefined();
    });
  });
});
