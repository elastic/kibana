/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/public';
import { prefixDataViewSpecFields } from './prefix_data_view_fields';

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
      fieldAttrs: { 'host.name': { customLabel: 'Host' } },
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
      fieldAttrs: { 'data.host.name': { customLabel: 'Host' } },
      fieldFormats: { 'data.severity': { id: 'string' } },
      runtimeFieldMap: { 'data.severity': { type: 'keyword' } },
      sourceFilters: [{ value: 'data.host.name' }],
    });
  });
});
