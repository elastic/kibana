/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import {
  isChangePointMetricField,
  isChangePointSplitField,
  isEsqlCompatibleField,
} from './change_point_field_utils';

const createField = (overrides: Partial<DataViewField> & { name: string }): DataViewField =>
  ({
    displayName: overrides.name,
    type: 'number',
    aggregatable: true,
    searchable: true,
    scripted: false,
    ...overrides,
  } as DataViewField);

describe('change_point_field_utils', () => {
  it('filters out scripted and runtime fields while keeping mapped fields in isEsqlCompatibleField', () => {
    const fields: DataViewField[] = [
      createField({ name: 'scripted_metric', scripted: true }),
      createField({
        name: 'runtime_metric',
        runtimeField: { type: 'long', script: { source: 'emit(1)' } },
      } as unknown as Partial<DataViewField> & { name: string }),
      createField({ name: 'bytes' }),
      createField({
        name: 'runtime_host',
        type: 'string',
        esTypes: [ES_FIELD_TYPES.KEYWORD],
        isMapped: false,
      }),
      createField({
        name: 'host.name',
        type: 'string',
        esTypes: [ES_FIELD_TYPES.KEYWORD],
      }),
    ];

    expect(fields.filter(isEsqlCompatibleField).map((field) => field.name)).toEqual([
      'bytes',
      'host.name',
    ]);
  });

  it('matches only aggregatable numeric fields in isChangePointMetricField', () => {
    expect(isChangePointMetricField(createField({ name: 'bytes', type: 'number' }))).toBe(true);
    expect(
      isChangePointMetricField(createField({ name: 'unagg', type: 'number', aggregatable: false }))
    ).toBe(false);
    expect(isChangePointMetricField(createField({ name: 'host', type: 'string' }))).toBe(false);
  });

  it('matches aggregatable keyword and IP fields excluding _id and _index in isChangePointSplitField', () => {
    expect(
      isChangePointSplitField(
        createField({ name: 'host.name', type: 'string', esTypes: [ES_FIELD_TYPES.KEYWORD] })
      )
    ).toBe(true);
    expect(
      isChangePointSplitField(
        createField({ name: 'client.ip', type: 'ip', esTypes: [ES_FIELD_TYPES.IP] })
      )
    ).toBe(true);
    expect(
      isChangePointSplitField(
        createField({ name: 'message', type: 'string', esTypes: [ES_FIELD_TYPES.TEXT] })
      )
    ).toBe(false);
    expect(
      isChangePointSplitField(
        createField({
          name: 'unagg_kw',
          type: 'string',
          aggregatable: false,
          esTypes: [ES_FIELD_TYPES.KEYWORD],
        })
      )
    ).toBe(false);
    expect(
      isChangePointSplitField(
        createField({ name: '_id', type: 'string', esTypes: [ES_FIELD_TYPES.KEYWORD] })
      )
    ).toBe(false);
    expect(
      isChangePointSplitField(
        createField({ name: '_index', type: 'string', esTypes: [ES_FIELD_TYPES.KEYWORD] })
      )
    ).toBe(false);
  });
});
