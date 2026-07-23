/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlViewName, type Streams } from '@kbn/streams-schema';
import { resolveEsqlFromTargets } from './resolve_esql_from_targets';

const createClassicStreamDefinition = (name: string): Streams.ClassicStream.Definition => ({
  name,
  description: '',
  type: 'classic',
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
});

const createWiredStreamDefinition = (name: string): Streams.WiredStream.Definition => ({
  name,
  description: '',
  updated_at: new Date().toISOString(),
  type: 'wired',
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

const createQueryStreamDefinition = (name: string): Streams.QueryStream.Definition => ({
  name,
  description: '',
  type: 'query',
  updated_at: new Date().toISOString(),
  query: {
    view: getEsqlViewName(name),
    esql: `FROM ${getEsqlViewName(name)}`,
  },
});

describe('resolveEsqlFromTargets', () => {
  it('returns bare names for classic and wired streams', async () => {
    const getStream = jest.fn(async (name: string) => {
      if (name === 'logs.classic') {
        return createClassicStreamDefinition(name);
      }
      return createWiredStreamDefinition(name);
    });

    await expect(
      resolveEsqlFromTargets({
        streamNames: ['logs.classic', 'logs.otel'],
        getStream,
      })
    ).resolves.toEqual(['logs.classic', 'logs.otel']);
  });

  it('returns the ES|QL view name for query streams', async () => {
    const getStream = jest.fn(async (name: string) => createQueryStreamDefinition(name));

    await expect(
      resolveEsqlFromTargets({
        streamNames: ['logging-eis', 'cars.electric'],
        getStream,
      })
    ).resolves.toEqual(['$.logging-eis', '$.cars.electric']);
  });

  it('falls back to the logical name when the stream cannot be loaded', async () => {
    const getStream = jest.fn(async (name: string) => {
      if (name === 'missing') {
        throw new Error('not found');
      }
      return createQueryStreamDefinition(name);
    });

    await expect(
      resolveEsqlFromTargets({
        streamNames: ['logging-eis', 'missing'],
        getStream,
      })
    ).resolves.toEqual(['$.logging-eis', 'missing']);
  });

  it('returns an empty list when no stream names are provided', async () => {
    const getStream = jest.fn();

    await expect(resolveEsqlFromTargets({ streamNames: [], getStream })).resolves.toEqual([]);
    expect(getStream).not.toHaveBeenCalled();
  });
});
