/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { pruneEsqlSelections } from './esql_prune_selections';

const columns: ESQLFieldWithMetadata[] = [
  { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
  { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
  { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
];

describe('pruneEsqlSelections', () => {
  it('keeps selections whose columns still exist', () => {
    const result = pruneEsqlSelections(
      {
        emittedTimeField: 'bucket',
        detectors: [{ function: 'mean', field: 'avg_bytes', byField: 'host' }],
        influencers: ['host'],
        summaryCountFieldName: '',
      },
      columns
    );

    expect(result).toEqual({
      emittedTimeField: 'bucket',
      detectors: [{ function: 'mean', field: 'avg_bytes', byField: 'host' }],
      influencers: ['host'],
      summaryCountFieldName: '',
    });
  });

  it('drops a detector whose field_name column disappeared', () => {
    const result = pruneEsqlSelections(
      {
        emittedTimeField: 'bucket',
        detectors: [
          { function: 'mean', field: 'removed_metric' },
          { function: 'mean', field: 'avg_bytes' },
        ],
        influencers: [],
        summaryCountFieldName: '',
      },
      columns
    );

    expect(result.detectors).toEqual([{ function: 'mean', field: 'avg_bytes' }]);
  });

  it('drops only the missing by/over/partition field, keeping the detector', () => {
    const result = pruneEsqlSelections(
      {
        emittedTimeField: 'bucket',
        detectors: [
          {
            function: 'mean',
            field: 'avg_bytes',
            byField: 'removed_dimension',
            overField: 'host',
          },
        ],
        influencers: [],
        summaryCountFieldName: '',
      },
      columns
    );

    expect(result.detectors).toEqual([{ function: 'mean', field: 'avg_bytes', overField: 'host' }]);
  });

  it('keeps a no-field-required detector (e.g. count) regardless of column changes', () => {
    const result = pruneEsqlSelections(
      {
        emittedTimeField: 'bucket',
        detectors: [{ function: 'count' }],
        influencers: [],
        summaryCountFieldName: '',
      },
      columns
    );

    expect(result.detectors).toEqual([{ function: 'count' }]);
  });

  it('drops influencers referencing removed columns', () => {
    const result = pruneEsqlSelections(
      {
        emittedTimeField: 'bucket',
        detectors: [],
        influencers: ['host', 'removed_dimension'],
        summaryCountFieldName: '',
      },
      columns
    );

    expect(result.influencers).toEqual(['host']);
  });

  it('clears the emitted time field and summary count field when their columns disappear', () => {
    const result = pruneEsqlSelections(
      {
        emittedTimeField: 'removed_time_col',
        detectors: [],
        influencers: [],
        summaryCountFieldName: 'removed_count_col',
      },
      columns
    );

    expect(result.emittedTimeField).toBe('');
    expect(result.summaryCountFieldName).toBe('');
  });
});
