/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { EXTENDED_FIELD_KEY_PREFIX } from '../constants';
import { useGlobalToggleFieldsFilterConfig } from './use_global_toggle_fields_filter_config';
import type { FilterOptions } from '../../../../common/ui';
import { DEFAULT_FROM_DATE, DEFAULT_TO_DATE } from '../../../containers/constants';

const emptyFilterOptions: FilterOptions = {
  search: '',
  searchFields: [],
  severity: [],
  status: [],
  tags: [],
  assignees: [],
  reporters: [],
  owner: [],
  category: [],
  customFields: {},
  extendedFieldFilters: [],
  from: DEFAULT_FROM_DATE,
  to: DEFAULT_TO_DATE,
};

const toggleField: InlineField = {
  name: 'requires_postmortem',
  label: 'Requires postmortem',
  type: 'boolean',
  control: FieldType.TOGGLE,
};

const textField: InlineField = {
  name: 'summary',
  label: 'Summary',
  type: 'keyword',
  control: FieldType.INPUT_TEXT,
};

describe('useGlobalToggleFieldsFilterConfig', () => {
  it('includes only TOGGLE global fields', () => {
    const { result } = renderHook(() =>
      useGlobalToggleFieldsFilterConfig({
        isSelectorView: false,
        globalInlineFields: [toggleField, textField],
        isLoading: false,
        onFilterOptionsChange: jest.fn(),
      })
    );

    expect(result.current.globalToggleFieldsFilterConfig).toHaveLength(1);
    expect(result.current.globalToggleFieldsFilterConfig[0].label).toBe('Requires postmortem');
    expect(result.current.globalToggleFieldsFilterConfig[0].key).toBe(
      `${EXTENDED_FIELD_KEY_PREFIX}requires_postmortem_as_boolean`
    );
  });

  it('returns empty config in selector view', () => {
    const { result } = renderHook(() =>
      useGlobalToggleFieldsFilterConfig({
        isSelectorView: true,
        globalInlineFields: [toggleField],
        isLoading: false,
        onFilterOptionsChange: jest.fn(),
      })
    );

    expect(result.current.globalToggleFieldsFilterConfig).toEqual([]);
  });

  it('clears only this field label from extendedFieldFilters', () => {
    const { result } = renderHook(() =>
      useGlobalToggleFieldsFilterConfig({
        isSelectorView: false,
        globalInlineFields: [toggleField],
        isLoading: false,
        onFilterOptionsChange: jest.fn(),
      })
    );

    const filter = result.current.globalToggleFieldsFilterConfig[0];
    const filterOptions: FilterOptions = {
      ...emptyFilterOptions,
      extendedFieldFilters: [
        { label: 'Other field', value: 'x' },
        { label: 'Requires postmortem', value: 'true' },
      ],
    };

    expect(filter.getEmptyOptions(filterOptions)).toEqual({
      extendedFieldFilters: [{ label: 'Other field', value: 'x' }],
    });
  });
});
