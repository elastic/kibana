/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { createDataContainerDataView, prefixDataViewSpecFields } from './prefix_data_view_fields';

const field = (spec: Partial<FieldSpec> & Pick<FieldSpec, 'name' | 'type'>): FieldSpec => ({
  searchable: true,
  aggregatable: true,
  ...spec,
});

describe('prefixDataViewSpecFields', () => {
  it('prefixes field names and the maps that look them up', () => {
    const spec: DataViewSpec = {
      id: 'logs-view',
      title: 'logs-*',
      timeFieldName: '@timestamp',
      fields: {
        'host.name': field({
          name: 'host.name',
          type: 'string',
          esTypes: ['keyword'],
          subType: { nested: { path: 'host' }, multi: { parent: 'host' } },
        }),
        _id: field({ name: '_id', type: 'string', esTypes: ['_id'] }),
      },
      fieldAttrs: { 'host.name': { customLabel: 'Host', customDescription: 'The host' } },
      fieldFormats: { severity: { id: 'string' } },
      runtimeFieldMap: { severity: { type: 'keyword' } },
      sourceFilters: [{ value: 'host.name' }],
    };

    expect(prefixDataViewSpecFields(spec)).toEqual({
      id: 'logs-view-data-container',
      title: 'logs-*',
      timeFieldName: 'data.@timestamp',
      fields: {
        'data.host.name': field({
          name: 'data.host.name',
          type: 'string',
          esTypes: ['keyword'],
          subType: { nested: { path: 'data.host' }, multi: { parent: 'data.host' } },
        }),
        _id: field({ name: '_id', type: 'string', esTypes: ['_id'] }),
      },
      fieldAttrs: { 'data.host.name': { customDescription: 'The host' } },
      fieldFormats: { 'data.severity': { id: 'string' } },
      runtimeFieldMap: { 'data.severity': { type: 'keyword' } },
      sourceFilters: [{ value: 'data.host.name' }],
    });
  });
});

describe('createDataContainerDataView', () => {
  it('keeps source field types on data.* names for a synthetic hit', () => {
    const source = new DataView({
      spec: {
        id: 'logs-view',
        title: 'logs-*',
        fields: {
          C: field({ name: 'C', type: 'number', esTypes: ['long'] }),
          'host.name': field({
            name: 'host.name',
            type: 'string',
            esTypes: ['keyword'],
            customLabel: 'Host',
          }),
        },
      },
      fieldFormats: fieldFormatsMock,
      metaFields: ['_id', '_index'],
    });

    const prefixed = createDataContainerDataView({
      sourceDataView: source,
      data: { C: 3, host: { name: 'web' } },
      fieldFormats: fieldFormatsMock,
    });

    expect(prefixed.getFieldByName('data')).toBeUndefined();
    expect(prefixed.getFieldByName('data.C')?.type).toBe('number');
    expect(prefixed.getFieldByName('data.C')?.esTypes).toEqual(['long']);
    expect(prefixed.getFieldByName('data.host.name')?.type).toBe('string');
    expect(prefixed.getFieldByName('data.host.name')?.displayName).toBe('data.host.name');

    const record = buildDataTableRecord(
      { _id: '1', _source: { data: { C: 3, host: { name: 'web' } } } },
      prefixed
    );

    expect(record.flattened['data.C']).toBe(3);
    expect(record.flattened['data.host.name']).toBe('web');
  });

  it('guesses the types of fields the source data view does not know', () => {
    const source = new DataView({
      spec: {
        id: 'logs-view',
        title: 'logs-*',
        fields: { C: field({ name: 'C', type: 'string', esTypes: ['keyword'] }) },
      },
      fieldFormats: fieldFormatsMock,
    });

    const dataView = createDataContainerDataView({
      sourceDataView: source,
      data: { C: 3, count: 12 },
      fieldFormats: fieldFormatsMock,
    });

    // The source wins over the guess.
    expect(dataView.getFieldByName('data.C')?.type).toBe('string');
    expect(dataView.getFieldByName('data.count')?.type).toBe('number');
  });

  it('builds a data view from the data alone when there is no source data view', () => {
    const data = {
      '@timestamp': '2026-04-29T10:00:00.000Z',
      host: { name: 'web', cpu: 0.75 },
      healthy: false,
    };

    const dataView = createDataContainerDataView({ data, fieldFormats: fieldFormatsMock });

    expect(dataView.id).toBe('alerting-v2-episode-data-container');
    expect(dataView.metaFields).toEqual([]);
    expect(dataView.getFieldByName('data.@timestamp')?.type).toBe('date');
    expect(dataView.getFieldByName('data.host.name')?.type).toBe('string');
    expect(dataView.getFieldByName('data.host.cpu')?.type).toBe('number');
    expect(dataView.getFieldByName('data.healthy')?.type).toBe('boolean');

    const record = buildDataTableRecord({ _id: '1', _source: { data } }, dataView);

    expect(record.flattened['data.host.name']).toBe('web');
    expect(record.flattened['data.healthy']).toBe(false);
  });
});
