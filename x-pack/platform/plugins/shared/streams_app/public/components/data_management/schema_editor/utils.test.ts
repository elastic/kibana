/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGeoPointSuggestion, buildSchemaSavePayload } from './utils';
import type { SchemaEditorField, SchemaField } from './types';
import type { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';

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
        processing: omit(mockDefinition.stream.ingest.processing, 'updated_at'),
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
        processing: omit(mockDefinition.stream.ingest.processing, 'updated_at'),
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
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { dsl: { data_retention: '1d' } },
      processing: { steps: [], updated_at: new Date().toISOString() },
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
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { dsl: { data_retention: '1d' } },
      processing: { steps: [], updated_at: new Date().toISOString() },
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

describe('getGeoPointSuggestion', () => {
  const mockFields = [
    { name: 'geo.lat', status: 'unmapped' },
    { name: 'geo.lon', status: 'unmapped' },
    { name: 'other', status: 'mapped', type: 'keyword' },
  ] as SchemaEditorField[];

  it('should return null for non-classic streams', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields: mockFields, streamType: 'wired' })
    ).toBeNull();
  });

  it('should return null if fields are undefined', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields: undefined, streamType: 'classic' })
    ).toBeNull();
  });

  it('should return null if field name does not end in .lat or .lon', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.other', fields: mockFields, streamType: 'classic' })
    ).toBeNull();
  });

  it('should return suggestion if sibling exists and base field is not mapped as geo_point', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields: mockFields, streamType: 'classic' })
    ).toEqual({ base: 'geo' });
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lon', fields: mockFields, streamType: 'classic' })
    ).toEqual({ base: 'geo' });
  });

  it('should return null if sibling does not exist', () => {
    const fields = [{ name: 'geo.lat', status: 'unmapped' }] as SchemaEditorField[];
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields, streamType: 'classic' })
    ).toBeNull();
  });

  it('should return null if base field is already mapped as geo_point', () => {
    const fields = [
      { name: 'geo.lat', status: 'unmapped' },
      { name: 'geo.lon', status: 'unmapped' },
      { name: 'geo', status: 'mapped', type: 'geo_point' },
    ] as SchemaEditorField[];
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields, streamType: 'classic' })
    ).toBeNull();
  });
});
