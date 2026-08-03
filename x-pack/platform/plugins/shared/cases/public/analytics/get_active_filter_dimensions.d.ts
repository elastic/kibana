import type { FilterOptions } from '../../common/ui/types';
/**
 * Bounded set of cases list filter dimensions that can be reported for telemetry. This is a
 * fixed enum of dimension *names* (not filter values) so the EBT field stays low-cardinality,
 * e.g. custom field filters are all bucketed under the single "customFields" dimension rather
 * than reporting the underlying custom field keys.
 */
export type FilterDimension = 'search' | 'severity' | 'status' | 'tags' | 'assignees' | 'reporters' | 'category' | 'customFields' | 'extendedFieldFilters' | 'dateRange';
/**
 * Compares `filterOptions` against `defaultFilterOptions` and returns the bounded list of
 * dimensions that have been changed from their defaults, i.e. the filters actively applied to
 * the cases list.
 */
export declare const getActiveFilterDimensions: (filterOptions: FilterOptions, defaultFilterOptions: FilterOptions) => FilterDimension[];
