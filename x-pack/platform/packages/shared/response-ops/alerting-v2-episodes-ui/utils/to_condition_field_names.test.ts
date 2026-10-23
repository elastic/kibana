/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeSearchField } from '../types/episode_data_source';
import { toConditionFieldNames } from './to_condition_field_names';

const field = (name: string, type = 'string'): EpisodeSearchField => ({
  name,
  type,
  esTypes: [type],
  searchable: true,
  aggregatable: true,
});

describe('toConditionFieldNames', () => {
  it('returns sorted scalar field names', () => {
    expect(
      toConditionFieldNames([field('host.name'), field('kibana.alert.start', 'date')])
    ).toEqual(['host.name', 'kibana.alert.start']);
  });

  it('excludes object and nested container fields', () => {
    expect(
      toConditionFieldNames([
        field('kibana.alert.grouping', 'object'),
        field('kibana.alert.rule.threshold', 'nested'),
        field('kibana.alert.status'),
      ])
    ).toEqual(['kibana.alert.status']);
  });

  it('excludes leaves of a nested object', () => {
    expect(
      toConditionFieldNames([
        {
          ...field('kibana.alert.rule.threshold.value'),
          subType: { nested: { path: 'threshold' } },
        },
        field('kibana.alert.status'),
      ])
    ).toEqual(['kibana.alert.status']);
  });

  it('dedupes repeated names', () => {
    expect(toConditionFieldNames([field('host.name'), field('host.name')])).toEqual(['host.name']);
  });

  it('returns an empty list for no fields', () => {
    expect(toConditionFieldNames([])).toEqual([]);
  });
});
