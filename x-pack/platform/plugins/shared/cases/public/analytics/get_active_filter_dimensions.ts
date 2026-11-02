/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'react-fast-compare';
import type { FilterOptions } from '../../common/ui/types';

/**
 * Bounded set of cases list filter dimensions that can be reported for telemetry. This is a
 * fixed enum of dimension *names* (not filter values) so the EBT field stays low-cardinality,
 * e.g. custom field filters are all bucketed under the single "customFields" dimension rather
 * than reporting the underlying custom field keys.
 */
export type FilterDimension =
  | 'search'
  | 'severity'
  | 'status'
  | 'tags'
  | 'assignees'
  | 'reporters'
  | 'category'
  | 'customFields'
  | 'extendedFieldFilters'
  | 'dateRange';

/**
 * Compares `filterOptions` against `defaultFilterOptions` and returns the bounded list of
 * dimensions that have been changed from their defaults, i.e. the filters actively applied to
 * the cases list.
 */
export const getActiveFilterDimensions = (
  filterOptions: FilterOptions,
  defaultFilterOptions: FilterOptions
): FilterDimension[] => {
  const dimensions: FilterDimension[] = [];

  const isActive = <T>(value: T, defaultValue: T) => !deepEqual(value, defaultValue);

  if (isActive(filterOptions.search, defaultFilterOptions.search)) {
    dimensions.push('search');
  }
  if (isActive(filterOptions.severity, defaultFilterOptions.severity)) {
    dimensions.push('severity');
  }
  if (isActive(filterOptions.status, defaultFilterOptions.status)) {
    dimensions.push('status');
  }
  if (isActive(filterOptions.tags, defaultFilterOptions.tags)) {
    dimensions.push('tags');
  }
  if (isActive(filterOptions.assignees, defaultFilterOptions.assignees)) {
    dimensions.push('assignees');
  }
  if (isActive(filterOptions.reporters, defaultFilterOptions.reporters)) {
    dimensions.push('reporters');
  }
  if (isActive(filterOptions.category, defaultFilterOptions.category)) {
    dimensions.push('category');
  }
  if (isActive(filterOptions.customFields, defaultFilterOptions.customFields)) {
    dimensions.push('customFields');
  }
  if (isActive(filterOptions.extendedFieldFilters, defaultFilterOptions.extendedFieldFilters)) {
    dimensions.push('extendedFieldFilters');
  }
  if (
    filterOptions.from !== defaultFilterOptions.from ||
    filterOptions.to !== defaultFilterOptions.to
  ) {
    dimensions.push('dateRange');
  }

  return dimensions;
};
