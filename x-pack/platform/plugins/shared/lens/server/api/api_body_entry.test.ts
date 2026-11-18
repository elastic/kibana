/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { expectApiBodyEntryRoundTrip } from '@kbn/saved-objects-management-plugin/server/mocks';
import { createLensApiBodyEntry } from './api_body_entry';

const builder = new LensConfigBuilder();
const entry = createLensApiBodyEntry(builder);

// Lens fills in style defaults on the way out, so a stored fixture is what a PUT stores after a GET.
const storedFromBody = (body: unknown) => {
  const { body: normalized } = entry.toApi(entry.toStored(entry.getSchema().parse(body)));
  return entry.toStored(normalized);
};

describe('lens API body entry', () => {
  it('round-trips a metric item with a data view reference and a tag', () => {
    const stored = storedFromBody({
      type: 'metric',
      title: 'Total requests',
      data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
      metrics: [{ type: 'primary', operation: 'count' }],
      tags: ['web-tag'],
    });

    expect(stored.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'index-pattern', id: 'logs-data-view' }),
        expect.objectContaining({ type: 'tag', id: 'web-tag' }),
      ])
    );
    expect(expectApiBodyEntryRoundTrip(entry, stored)).toEqual(
      expect.objectContaining({
        type: 'metric',
        title: 'Total requests',
        data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
        tags: ['web-tag'],
      })
    );
  });

  it('round-trips an XY item with an inline data view', () => {
    const stored = storedFromBody({
      type: 'xy',
      title: 'Log entries over time',
      layers: [
        {
          type: 'line',
          data_source: {
            type: 'data_view_spec',
            index_pattern: 'kibana_sample_data_logs',
            time_field: 'timestamp',
          },
          x: { operation: 'date_histogram', field: 'timestamp' },
          y: [{ operation: 'count' }],
        },
      ],
    });

    expect(expectApiBodyEntryRoundTrip(entry, stored)).toEqual(
      expect.objectContaining({ type: 'xy', title: 'Log entries over time' })
    );
  });

  it('throws for an ES|QL item, as the public GET does', () => {
    const { references, ...attributes } = builder.fromAPIFormat({
      type: 'metric',
      title: 'ES|QL count',
      data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
      metrics: [{ type: 'primary', column: 'count' }],
      sampling: 1,
      ignore_global_filters: false,
    });

    expect(() => entry.toApi({ attributes, references: references ?? [] })).toThrow(
      'ES|QL charts are not supported in by-ref Lens'
    );
  });
});
