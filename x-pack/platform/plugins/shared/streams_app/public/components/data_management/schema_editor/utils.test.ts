/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { SchemaField } from './types';
import { buildSchemaSavePayload } from './utils';

describe('buildSchemaSavePayload', () => {
  it('builds payload for wired streams by updating wired.fields', () => {
    const mockDefinition = buildWiredDefinition();

    const schemaFields: SchemaField[] = [
      {
        name: 'message',
        parent: '',
        status: 'mapped',
        type: 'keyword',
      },
      {
        name: '@timestamp',
        parent: '',
        status: 'mapped',
        type: 'date',
        format: 'strict_date_optional_time',
      },
      {
        name: 'severity',
        parent: '',
        status: 'mapped',
        type: 'keyword',
        additionalParameters: { ignore_above: 256 },
      },
    ];

    const payload = buildSchemaSavePayload(mockDefinition, schemaFields);

    expect(payload).toEqual({
      ingest: {
        ...mockDefinition.stream.ingest,
        wired: {
          ...mockDefinition.stream.ingest.wired,
          fields: {
            message: { type: 'keyword' },
            '@timestamp': { type: 'date', format: 'strict_date_optional_time' },
            severity: { type: 'keyword', ignore_above: 256 },
          },
        },
      },
    });
  });

  it('builds payload for classic streams by updating classic.field_overrides', () => {
    const mockDefinition = buildClassicDefinition();
    const schemaFields: SchemaField[] = [
      {
        name: 'host.name',
        parent: '',
        status: 'mapped',
        type: 'keyword',
      },
      {
        name: 'event.ingested',
        parent: '',
        status: 'mapped',
        type: 'date',
      },
    ];

    const payload = buildSchemaSavePayload(mockDefinition, schemaFields);

    expect(payload).toEqual({
      ingest: {
        ...mockDefinition.stream.ingest,
        classic: {
          ...mockDefinition.stream.ingest.classic,
          field_overrides: {
            'host.name': { type: 'keyword' },
            'event.ingested': { type: 'date' },
          },
        },
      },
    });
  });
});

const privileges = {
  manage: true,
  monitor: true,
  view_index_metadata: true,
  lifecycle: true,
  simulate: true,
  text_structure: true,
  read_failure_store: true,
  manage_failure_store: true,
};

const buildWiredDefinition = (): Streams.WiredStream.GetResponse => ({
  stream: {
    name: 'logs',
    description: 'Wired stream',
    ingest: {
      lifecycle: { dsl: { data_retention: '1d' } },
      processing: { steps: [] },
      settings: {},
      wired: {
        fields: {},
        routing: [],
      },
      failure_store: { disabled: {} },
    },
  },
  dashboards: [],
  rules: [],
  queries: [],
  inherited_fields: {},
  effective_lifecycle: { dsl: { data_retention: '1d' }, from: 'parent' },
  effective_settings: {},
  privileges: { ...privileges },
  effective_failure_store: { disabled: {}, from: 'parent' },
});

const buildClassicDefinition = (): Streams.ClassicStream.GetResponse => ({
  stream: {
    name: 'logs-classic',
    description: 'Classic stream',
    ingest: {
      lifecycle: { dsl: { data_retention: '1d' } },
      processing: { steps: [] },
      settings: {},
      classic: {
        field_overrides: {},
      },
      failure_store: { disabled: {} },
    },
  },
  dashboards: [],
  rules: [],
  queries: [],
  elasticsearch_assets: undefined,
  data_stream_exists: true,
  effective_lifecycle: { inherit: {} },
  effective_settings: {},
  privileges: { ...privileges },
  effective_failure_store: { disabled: {} },
});
