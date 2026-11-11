/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ecsRootBuiltInFieldNames,
  LOGS_ECS_STREAM_NAME,
  otelRootBuiltInFieldNames,
  type FieldDefinition,
  type Streams,
} from '@kbn/streams-schema';
import { hasAlteredStreams } from './tab_ids';

const untouched = (name: string): Streams.ClassicStream.Definition => ({
  name,
  description: '',
  updated_at: '2026-01-01T00:00:00.000Z',
  type: 'classic',
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: '2026-01-01T00:00:00.000Z' },
    settings: {},
    classic: {},
    failure_store: { inherit: {} },
  },
});

const untouchedWired = (name: string): Streams.WiredStream.Definition => ({
  name,
  description: '',
  updated_at: '2026-01-01T00:00:00.000Z',
  type: 'wired',
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: '2026-01-01T00:00:00.000Z' },
    settings: {},
    failure_store: { inherit: {} },
    wired: { fields: {}, routing: [] },
  },
});

/** Keys of `otelBaseFields` / `ecsBaseFields`, which `getDefaultRootFields` ships on wired roots. */
const shippedRootFields = (name: string): FieldDefinition => {
  const fieldNames =
    name === LOGS_ECS_STREAM_NAME ? ecsRootBuiltInFieldNames : otelRootBuiltInFieldNames;
  const fields: FieldDefinition = {};
  for (const fieldName of fieldNames) {
    fields[fieldName] = { type: 'keyword' };
  }
  return fields;
};

/** Shape written by `createRootStreamDefinition` for logs, logs.otel, and logs.ecs. */
const shippedWiredRoot = (name: string): Streams.WiredStream.Definition => {
  const stream = untouchedWired(name);
  return {
    ...stream,
    ingest: {
      ...stream.ingest,
      lifecycle: { dsl: {} },
      failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
      wired: { fields: shippedRootFields(name), routing: [] },
    },
  };
};

describe('hasAlteredStreams', () => {
  it('ignores data streams that have never been edited', () => {
    expect(hasAlteredStreams([untouched('logs-nginx-default')])).toBe(false);
  });

  it('ignores a classic stream whose only lifecycle is an empty dsl', () => {
    const stream = untouched('logs-nginx-default');
    stream.ingest.lifecycle = { dsl: {} };
    expect(hasAlteredStreams([stream])).toBe(false);
  });

  it('ignores a shipped wired root, query streams, and the unit metrics stream', () => {
    expect(
      hasAlteredStreams([
        shippedWiredRoot('logs.otel'),
        {
          name: 'logs.otel.errors',
          description: '',
          updated_at: '2026-01-01T00:00:00.000Z',
          type: 'query',
        } as Streams.all.Definition,
        untouched('metrics-streams.otel-default'),
      ])
    ).toBe(false);
  });

  it.each<[string, Partial<Streams.ClassicStream.Definition['ingest']>]>([
    ['processing', { processing: { steps: [{}] } as never }],
    ['processors', { processing: { processors: [{}] } as never }],
    [
      'field overrides',
      { classic: { field_overrides: { message: { type: 'keyword' } } } as never },
    ],
    ['lifecycle', { lifecycle: { dsl: { data_retention: '7d' } } as never }],
    ['settings', { settings: { 'index.number_of_shards': { value: 1 } } as never }],
    ['failure store', { failure_store: { disabled: {} } as never }],
    [
      'failure store retention',
      { failure_store: { lifecycle: { enabled: { data_retention: '30d' } } } as never },
    ],
  ])('counts a classic stream with saved %s', (_, ingest) => {
    const stream = untouched('logs-nginx-default');
    expect(hasAlteredStreams([{ ...stream, ingest: { ...stream.ingest, ...ingest } }])).toBe(true);
  });

  it('counts a wired child even when its definition is otherwise empty', () => {
    expect(hasAlteredStreams([untouchedWired('logs.otel.nginx')])).toBe(true);
  });

  it.each(['logs', 'logs.otel', 'logs.ecs'])('ignores the shipped %s root defaults', (name) => {
    expect(hasAlteredStreams([shippedWiredRoot(name)])).toBe(false);
  });

  it('counts a wired root with a user field besides the shipped defaults', () => {
    const stream = shippedWiredRoot('logs.otel');
    stream.ingest.wired.fields['attributes.custom'] = { type: 'keyword' };
    expect(hasAlteredStreams([stream])).toBe(true);
  });

  it('counts a wired root with a saved lifecycle dsl', () => {
    const stream = shippedWiredRoot('logs.ecs');
    stream.ingest.lifecycle = { dsl: { data_retention: '30d' } };
    expect(hasAlteredStreams([stream])).toBe(true);
  });

  it.each<[string, Streams.WiredStream.Definition['ingest']['failure_store']]>([
    ['a non-default retention', { lifecycle: { enabled: { data_retention: '7d' } } }],
    ['the failure store disabled', { disabled: {} }],
    ['failure store lifecycle disabled', { lifecycle: { disabled: {} } }],
  ])('counts a wired root with %s', (_, failureStore) => {
    const stream = shippedWiredRoot('logs');
    stream.ingest.failure_store = failureStore;
    expect(hasAlteredStreams([stream])).toBe(true);
  });

  it.each<[string, Partial<Streams.WiredStream.Definition['ingest']>]>([
    [
      'fields',
      { wired: { fields: { 'attributes.custom': { type: 'keyword' } }, routing: [] } as never },
    ],
    ['routing', { wired: { fields: {}, routing: [{ destination: 'logs.otel.nginx' }] } as never }],
    ['processing', { processing: { steps: [{}] } as never }],
  ])('counts a wired root with saved %s', (_, ingest) => {
    const stream = untouchedWired('logs.otel');
    expect(hasAlteredStreams([{ ...stream, ingest: { ...stream.ingest, ...ingest } }])).toBe(true);
  });

  it('ignores draft streams, including a child with saved fields', () => {
    const draft = untouchedWired('logs.otel.nginx');
    draft.ingest.wired = {
      fields: { 'body.text': { type: 'keyword' } },
      routing: [],
      draft: true,
    };

    expect(hasAlteredStreams([draft])).toBe(false);
  });

  it('ignores routing that only exists for a draft stream', () => {
    const root = shippedWiredRoot('logs.otel');
    const draft = untouchedWired('logs.otel.nginx');
    draft.ingest.wired.draft = true;
    root.ingest.wired.routing = [
      { destination: 'logs.otel.nginx', where: { always: {} } },
      { destination: 'logs.otel.app', where: { always: {} }, draft: true },
    ] as typeof root.ingest.wired.routing;

    expect(hasAlteredStreams([root, draft])).toBe(false);
  });
});
