/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptions } from '../../common/ui/types';
import { CaseSeverity, CaseStatuses, CustomFieldTypes } from '../../common/types/domain';
import { DEFAULT_FILTER_OPTIONS } from '../containers/constants';
import { getActiveFilterDimensions } from './get_active_filter_dimensions';

describe('getActiveFilterDimensions', () => {
  it('returns an empty array when the filters match the defaults', () => {
    expect(getActiveFilterDimensions(DEFAULT_FILTER_OPTIONS, DEFAULT_FILTER_OPTIONS)).toEqual([]);
  });

  it('detects each changed dimension independently', () => {
    const filterOptions: FilterOptions = {
      ...DEFAULT_FILTER_OPTIONS,
      search: 'foo',
      severity: [CaseSeverity.HIGH],
      status: [CaseStatuses.open],
      tags: ['tag-1'],
      assignees: ['user-1'],
      category: ['category-1'],
      customFields: { 'cf-1': { type: CustomFieldTypes.TEXT, options: [] } },
      extendedFieldFilters: [{ label: 'label', value: 'value' }],
      from: 'now-7d',
    };

    expect(getActiveFilterDimensions(filterOptions, DEFAULT_FILTER_OPTIONS)).toEqual([
      'search',
      'severity',
      'status',
      'tags',
      'assignees',
      'category',
      'customFields',
      'extendedFieldFilters',
      'dateRange',
    ]);
  });

  it('does not report unbounded custom field values, only the bucketed dimension name', () => {
    const filterOptions: FilterOptions = {
      ...DEFAULT_FILTER_OPTIONS,
      customFields: {
        'some-uuid-custom-field-key': { type: CustomFieldTypes.TEXT, options: ['a', 'b'] },
      },
    };

    expect(getActiveFilterDimensions(filterOptions, DEFAULT_FILTER_OPTIONS)).toEqual([
      'customFields',
    ]);
  });
});
