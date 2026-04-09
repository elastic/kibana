/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import type { Streams } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '../api';
import { createStreamsSourceEnricher } from './esql_source_enricher';

const NOW = '2024-01-01T00:00:00.000Z';

const wiredStreamDefinition: Streams.WiredStream.Definition = {
  name: 'logs',
  type: 'wired',
  description: 'All logs',
  updated_at: NOW,
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: NOW },
    settings: {},
    failure_store: { inherit: {} },
    wired: { fields: {}, routing: [] },
  },
};

const classicStreamDefinition: Streams.ClassicStream.Definition = {
  name: 'classic-logs',
  type: 'classic',
  description: 'Classic log stream',
  updated_at: NOW,
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: NOW },
    settings: {},
    failure_store: { inherit: {} },
    classic: {},
  },
};

const wiredStreamNoDescription: Streams.WiredStream.Definition = {
  ...wiredStreamDefinition,
  name: 'no-desc-stream',
  description: '',
};

const makeSource = (name: string, extra: Partial<ESQLSourceResult> = {}): ESQLSourceResult => ({
  name,
  hidden: false,
  ...extra,
});

const makeRepositoryClient = (
  streams: Streams.all.Definition[]
): jest.Mocked<StreamsRepositoryClient> =>
  ({
    fetch: jest.fn().mockResolvedValue({ streams }),
  } as unknown as jest.Mocked<StreamsRepositoryClient>);

const makeApplication = (
  getUrlForApp = jest
    .fn()
    .mockImplementation((_appId: string, { path }: { path: string }) => `http://localhost${path}`)
): Promise<Pick<ApplicationStart, 'getUrlForApp'>> => Promise.resolve({ getUrlForApp });

describe('createStreamsSourceEnricher', () => {
  it('returns sources unchanged when none match a stream', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([wiredStreamDefinition]),
      makeApplication()
    );
    const sources = [makeSource('unrelated-index')];

    const result = await enricher(sources);

    expect(result).toEqual(sources);
  });

  it('enriches a source matching a wired stream with type, description, and link', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([wiredStreamDefinition]),
      makeApplication()
    );
    const sources = [makeSource('logs')];

    const [result] = await enricher(sources);

    expect(result.type).toBe(SOURCES_TYPES.WIRED_STREAM);
    expect(result.description).toBe('All logs');
    expect(result.links).toHaveLength(1);
    expect(result.links![0].url).toBe('http://localhost/logs/management/overview');
    expect(result.links![0].label).toContain('logs');
  });

  it('enriches a source matching a classic stream with type, description, and link', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([classicStreamDefinition]),
      makeApplication()
    );
    const sources = [makeSource('classic-logs')];

    const [result] = await enricher(sources);

    expect(result.type).toBe(SOURCES_TYPES.CLASSIC_STREAM);
    expect(result.description).toBe('Classic log stream');
    expect(result.links).toHaveLength(1);
    expect(result.links![0].url).toBe('http://localhost/classic-logs/management/overview');
  });

  it('sets description to undefined when the stream has an empty description', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([wiredStreamNoDescription]),
      makeApplication()
    );
    const sources = [makeSource('no-desc-stream')];

    const [result] = await enricher(sources);

    expect(result.description).toBeUndefined();
  });

  it('enriches only matching sources in a mixed list', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([wiredStreamDefinition, classicStreamDefinition]),
      makeApplication()
    );
    const sources = [makeSource('logs'), makeSource('other-index'), makeSource('classic-logs')];

    const result = await enricher(sources);

    expect(result[0].type).toBe(SOURCES_TYPES.WIRED_STREAM);
    expect(result[1]).toEqual(makeSource('other-index'));
    expect(result[2].type).toBe(SOURCES_TYPES.CLASSIC_STREAM);
  });

  it('preserves existing source fields when enriching', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([wiredStreamDefinition]),
      makeApplication()
    );
    const source = makeSource('logs', { hidden: true, title: 'Logs title' });

    const [result] = await enricher([source]);

    expect(result.hidden).toBe(true);
    expect(result.title).toBe('Logs title');
    expect(result.name).toBe('logs');
  });

  it('returns sources unchanged when the streams API call fails (graceful degradation)', async () => {
    const failingClient = {
      fetch: jest.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as jest.Mocked<StreamsRepositoryClient>;
    const enricher = createStreamsSourceEnricher(failingClient, makeApplication());
    const sources = [makeSource('logs'), makeSource('other-index')];

    const result = await enricher(sources);

    expect(result).toEqual(sources);
  });

  it('returns sources unchanged when streams list is empty', async () => {
    const enricher = createStreamsSourceEnricher(makeRepositoryClient([]), makeApplication());
    const sources = [makeSource('logs'), makeSource('metrics')];

    const result = await enricher(sources);

    expect(result).toEqual(sources);
  });

  it('returns an empty array when sources is empty', async () => {
    const enricher = createStreamsSourceEnricher(
      makeRepositoryClient([wiredStreamDefinition]),
      makeApplication()
    );

    const result = await enricher([]);

    expect(result).toEqual([]);
  });
});
