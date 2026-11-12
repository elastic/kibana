/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { withEpisodeDataFields } from './with_episode_data_fields';

const makeField = (name: string, type: string, esType: string): FieldSpec => ({
  name,
  type,
  esTypes: [esType],
  searchable: true,
  aggregatable: true,
});

const makeDataView = (id: string, fields: FieldSpec[]) =>
  new DataView({
    spec: {
      id,
      title: id,
      fields: Object.fromEntries(fields.map((field) => [field.name, field])),
    },
    fieldFormats: fieldFormatsMock,
  });

describe('withEpisodeDataFields', () => {
  const mockDiscoverDataView = makeDataView('esql', [makeField('episode.id', 'string', 'keyword')]);
  const mockSourceDataView = makeDataView('source', [
    makeField('host.name', 'string', 'keyword'),
    makeField('cpu', 'number', 'double'),
    makeField('_id', 'string', '_id'),
  ]);

  it('adds the source fields as typed data fields', () => {
    const dataView = withEpisodeDataFields(
      mockDiscoverDataView,
      mockSourceDataView,
      fieldFormatsMock
    );

    expect(dataView.fields.getByName('data.host.name')?.esTypes).toEqual(['keyword']);
    expect(dataView.fields.getByName('data.cpu')?.type).toBe('number');
  });

  it('keeps the Discover fields and id', () => {
    const dataView = withEpisodeDataFields(
      mockDiscoverDataView,
      mockSourceDataView,
      fieldFormatsMock
    );

    expect(dataView.id).toBe('esql');
    expect(dataView.fields.getByName('episode.id')?.esTypes).toEqual(['keyword']);
  });

  it('leaves out the source meta fields', () => {
    const dataView = withEpisodeDataFields(
      mockDiscoverDataView,
      mockSourceDataView,
      fieldFormatsMock
    );

    expect(dataView.fields.getByName('_id')).toBeUndefined();
  });
});
