/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractNonAggregatableDatasets } from './extract_non_aggregatable_datasets';
import { Indices } from '@elastic/elasticsearch/lib/api/types';

describe('extractNonAggregatableDatasets', () => {
  it('Indices and nonAggregatableIndices are empty', async () => {
    const indices: Indices = [];
    const nonAggregatableIndices: Indices = [];
    const result = extractNonAggregatableDatasets(indices, nonAggregatableIndices);

    expect(result).toEqual([]);
  });

  it('nonAggregatableIndices is empty', async () => {
    const indices: Indices = ['.ds-logs-synth.2-default-2025.02.05-000001'];
    const nonAggregatableIndices: Indices = [];
    const result = extractNonAggregatableDatasets(indices, nonAggregatableIndices);

    expect(result).toEqual([]);
  });

  it('Indices is string', async () => {
    const indices: Indices = '.ds-logs-synth.2-default-2025.02.05-000001';
    const nonAggregatableIndices: Indices = ['.ds-logs-synth.2-default-2025.02.05-000001'];
    const result = extractNonAggregatableDatasets(indices, nonAggregatableIndices);

    expect(result).toEqual(['logs-synth.2-default']);
  });

  it('nonAggregatableIndices is string', async () => {
    const indices: Indices = ['.ds-logs-synth.2-default-2025.02.05-000001'];
    const nonAggregatableIndices: Indices = '.ds-logs-synth.2-default-2025.02.05-000001';
    const result = extractNonAggregatableDatasets(indices, nonAggregatableIndices);

    expect(result).toEqual(['logs-synth.2-default']);
  });

  it('Dataset is aggregatable', async () => {
    const indices: Indices = [
      '.ds-logs-synth.2-default-2025.02.05-000001',
      '.ds-logs-synth.2-default-2025.02.05-000002',
    ];
    const nonAggregatableIndices: Indices = ['.ds-logs-synth.2-default-2025.02.05-000001'];
    const result = extractNonAggregatableDatasets(indices, nonAggregatableIndices);

    expect(result).toEqual([]);
  });

  it('Some datasets are non-aggregatable', async () => {
    const indices: Indices = [
      '.ds-logs-synth.1-default-2025.02.05-000001',
      '.ds-logs-synth.2-default-2025.02.05-000001',
      '.ds-logs-synth.2-default-2025.02.05-000002',
      '.ds-logs-synth.3-default-2025.02.05-000001',
      '.ds-logs-synth.3-default-2025.02.05-000002',
      '.ds-logs-synth.3-default-2025.02.05-000003',
      '.ds-logs-synth.4-default-2025.02.05-000001',
    ];
    const nonAggregatableIndices: Indices = [
      '.ds-logs-synth.1-default-2025.02.05-000001',
      '.ds-logs-synth.2-default-2025.02.05-000001',
      '.ds-logs-synth.2-default-2025.02.05-000002',
      '.ds-logs-synth.3-default-2025.02.05-000001',
      '.ds-logs-synth.3-default-2025.02.05-000002',
    ];
    const result = extractNonAggregatableDatasets(indices, nonAggregatableIndices);

    expect(result).toEqual(['logs-synth.1-default', 'logs-synth.2-default']);
  });
});
