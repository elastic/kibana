/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import type { EntityTableSortDirection } from '../entity_table';
import type { Destination, DestinationRow } from './types';

const TAG_QUERY_PREFIX = 'tag:';

const SORTABLE_FIELDS = [
  'name',
  'documentsCount',
  'ingestionRate',
  'storageBytes',
  'dataQuality',
  'retentionMs',
] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export const isSortableField = (value: string): value is SortableField =>
  (SORTABLE_FIELDS as readonly string[]).includes(value);

export type MetricSortField = Exclude<SortableField, 'name' | 'retentionMs'>;

export const getEffectiveSortField = (
  sortField: string,
  metricSortReady: Record<MetricSortField, boolean>
): SortableField => {
  if (!isSortableField(sortField)) {
    return 'name';
  }
  if (sortField === 'name' || sortField === 'retentionMs') {
    return sortField;
  }
  return metricSortReady[sortField] ? sortField : 'name';
};

const QUALITY_RANK: Record<QualityIndicators, number> = {
  poor: 0,
  degraded: 1,
  good: 2,
};

type SortDirectionFactor = 1 | -1;

const compareRows = (
  a: DestinationRow,
  b: DestinationRow,
  field: SortableField,
  directionFactor: SortDirectionFactor
): number => {
  if (field === 'name') {
    return directionFactor * a.name.localeCompare(b.name);
  }
  if (field === 'dataQuality') {
    return directionFactor * (toQualityRank(a.dataQuality) - toQualityRank(b.dataQuality));
  }
  return compareNumbers(a[field], b[field], directionFactor);
};

const compareNumbers = (
  aValue: number | undefined,
  bValue: number | undefined,
  directionFactor: SortDirectionFactor
): number => {
  // An unknown value sorts last whichever direction the user picked.
  if (aValue === undefined) {
    return bValue === undefined ? 0 : 1;
  }
  if (bValue === undefined) {
    return -1;
  }

  return directionFactor * (aValue - bValue);
};

const toQualityRank = (quality: QualityIndicators | undefined): number =>
  quality !== undefined ? QUALITY_RANK[quality] : Number.NEGATIVE_INFINITY;

export const matchesDestinationQuery = (destination: Destination, query: string): boolean => {
  if (!query) {
    return true;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    if (token.startsWith(TAG_QUERY_PREFIX)) {
      const tag = token.slice(TAG_QUERY_PREFIX.length);
      if (tag === 'managed') {
        return destination.isManaged;
      }
      if (tag === 'internal') {
        return destination.isInternal;
      }
      return destination.tags.some((value) => value.toLowerCase() === tag);
    }

    return (
      destination.name.toLowerCase().includes(token) ||
      destination.description.toLowerCase().includes(token) ||
      destination.tags.some((value) => value.toLowerCase().includes(token))
    );
  });
};

export const buildDestinationRows = ({
  destinations,
  searchText,
  selectedQualities,
  docsByStream,
  ingestionByStream,
  storageByStream,
  qualityByStream,
  sortField,
  sortDirection,
}: {
  destinations: Destination[];
  searchText: string;
  selectedQualities: string[];
  docsByStream: Record<string, number>;
  ingestionByStream: Record<string, number>;
  storageByStream: Record<string, number>;
  qualityByStream: Record<string, QualityIndicators>;
  sortField: SortableField;
  sortDirection: EntityTableSortDirection;
}): DestinationRow[] => {
  const query = searchText.trim().toLowerCase();
  const directionFactor: SortDirectionFactor = sortDirection === 'desc' ? -1 : 1;

  return destinations
    .filter((destination) => matchesDestinationQuery(destination, query))
    .map((destination) => ({
      ...destination,
      documentsCount: docsByStream[destination.name] ?? 0,
      ingestionRate: ingestionByStream[destination.name] ?? 0,
      storageBytes: storageByStream[destination.name] ?? 0,
      dataQuality: qualityByStream[destination.name],
    }))
    .filter(
      (row) =>
        selectedQualities.length === 0 ||
        (row.dataQuality !== undefined && selectedQualities.includes(row.dataQuality))
    )
    .sort((a, b) => compareRows(a, b, sortField, directionFactor));
};
