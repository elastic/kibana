/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { buildEpisodesFilters } from './build_episodes_filters';
import type { EpisodesFilterState } from './build_episodes_esql_query';

const mockDataView = {
  id: 'test-data-view-id',
  getFieldByName: jest.fn(),
} as unknown as DataView;

const mockField = (name: string): DataViewField =>
  ({
    name,
    type: 'string',
  } as DataViewField);

describe('buildEpisodesFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when filterState is undefined', () => {
    const result = buildEpisodesFilters(undefined, mockDataView);
    expect(result).toEqual([]);
  });

  it('returns empty array when filterState is empty', () => {
    const filterState: EpisodesFilterState = {};
    const result = buildEpisodesFilters(filterState, mockDataView);
    expect(result).toEqual([]);
  });

  it('builds status filter when status is provided', () => {
    const filterState: EpisodesFilterState = { status: 'active' };
    (mockDataView.getFieldByName as jest.Mock).mockReturnValue(mockField('episode.status'));

    const result = buildEpisodesFilters(filterState, mockDataView);

    expect(mockDataView.getFieldByName).toHaveBeenCalledWith('episode.status');
    expect(result).toHaveLength(1);
    expect(result[0].query!.match_phrase['episode.status']).toBe(filterState.status);
  });

  it('builds ruleId filter when ruleId is provided', () => {
    const filterState: EpisodesFilterState = { ruleId: 'rule-123' };
    (mockDataView.getFieldByName as jest.Mock).mockReturnValue(mockField('rule.id'));

    const result = buildEpisodesFilters(filterState, mockDataView);

    expect(mockDataView.getFieldByName).toHaveBeenCalledWith('rule.id');
    expect(result).toHaveLength(1);
    expect(result[0].query!.match_phrase['rule.id']).toBe(filterState.ruleId);
  });

  it('builds kuery filter when kuery is provided', () => {
    const filterState: EpisodesFilterState = { kuery: 'host.name: "server-1"' };

    const result = buildEpisodesFilters(filterState, mockDataView);

    expect(result).toHaveLength(1);
    expect(result[0].query).toEqual({
      query_string: {
        query: 'host.name: "server-1"',
      },
    });
    expect(result[0].meta.index).toBe('test-data-view-id');
  });

  it('trims kuery before adding filter', () => {
    const filterState: EpisodesFilterState = { kuery: '  host.name: "server-1"  ' };

    const result = buildEpisodesFilters(filterState, mockDataView);

    expect(result[0].query).toEqual({
      query_string: {
        query: 'host.name: "server-1"',
      },
    });
  });

  it('skips kuery filter when kuery is only whitespace', () => {
    const filterState: EpisodesFilterState = { kuery: '   ' };

    const result = buildEpisodesFilters(filterState, mockDataView);

    expect(result).toHaveLength(0);
  });

  it('combines multiple filters when all are provided', () => {
    const filterState: EpisodesFilterState = {
      status: 'active',
      ruleId: 'rule-123',
      kuery: 'host.name: "server-1"',
    };
    (mockDataView.getFieldByName as jest.Mock).mockImplementation((name: string) =>
      mockField(name)
    );

    const result = buildEpisodesFilters(filterState, mockDataView);

    expect(result).toHaveLength(3);
    expect(mockDataView.getFieldByName).toHaveBeenCalledWith('episode.status');
    expect(mockDataView.getFieldByName).toHaveBeenCalledWith('rule.id');
  });

  it('skips filter when field is not found in dataView', () => {
    const filterState: EpisodesFilterState = { status: 'active' };
    (mockDataView.getFieldByName as jest.Mock).mockReturnValue(undefined);

    const result = buildEpisodesFilters(filterState, mockDataView);

    expect(result).toHaveLength(0);
  });
});
