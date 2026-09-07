/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { FilterConfig, FilterConfigRenderParams } from './types';
import { useFilterConfig } from './use_filter_config';
import type { FilterOptions } from '../../../../common/ui';
import { CUSTOM_FIELD_KEY_PREFIX, EXTENDED_FIELD_KEY_PREFIX } from '../constants';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { DEFAULT_FROM_DATE, DEFAULT_TO_DATE } from '../../../containers/constants';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';

jest.mock('../../../common/use_cases_local_storage');

const useCasesLocalStorageMock = useCasesLocalStorage as jest.Mock;

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

describe('useFilterConfig', () => {
  const onFilterOptionsChange = jest.fn();
  const getEmptyOptions = jest.fn().mockReturnValue({ severity: [] });
  const filters: FilterConfig[] = [
    {
      key: 'severity',
      label: 'Severity',
      isActive: true,
      isAvailable: true,
      getEmptyOptions,
      render: ({ filterOptions }: FilterConfigRenderParams) => null,
    },
    {
      key: 'tags',
      label: 'Tags',
      isActive: true,
      isAvailable: true,
      getEmptyOptions() {
        return { tags: ['initialValue'] };
      },
      render: ({ filterOptions }: FilterConfigRenderParams) => null,
    },
  ];

  beforeEach(() => {
    useCasesLocalStorageMock.mockImplementation((_key: string, initialValue: unknown) => [
      initialValue,
      jest.fn(),
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should remove a selected option if the filter is deleted', async () => {
    const { rerender } = renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: emptyFilterOptions,
        customFields: [],
        isLoading: false,
      },
    });

    expect(onFilterOptionsChange).not.toHaveBeenCalled();

    rerender({
      systemFilterConfig: [],
      onFilterOptionsChange,
      isSelectorView: false,
      filterOptions: emptyFilterOptions,
      customFields: [],
      isLoading: false,
    });

    expect(getEmptyOptions).toHaveBeenCalledTimes(1);
    expect(onFilterOptionsChange).toHaveBeenCalledTimes(1);
    expect(onFilterOptionsChange).toHaveBeenCalledWith({
      severity: [],
      tags: ['initialValue'],
    });
  });

  it('should activate custom fields correctly when they are hidden', async () => {
    const customFieldKey = 'toggleKey';
    const uiCustomFieldKey = `${CUSTOM_FIELD_KEY_PREFIX}${customFieldKey}`;

    useCasesLocalStorageMock.mockImplementation(() => [
      [{ key: uiCustomFieldKey, isActive: false }],
      jest.fn(),
    ]);

    const { result } = renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          customFields: { [customFieldKey]: { type: CustomFieldTypes.TOGGLE, options: ['on'] } },
        },
        customFields: [
          {
            key: customFieldKey,
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'My toggle',
          },
        ],
        templatesEnabled: false,
        isLoading: false,
      },
    });

    expect(result.current.activeSelectableOptionKeys).toEqual([uiCustomFieldKey]);
  });

  it('should surface global TOGGLE fields when templates are enabled', () => {
    const { result } = renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: emptyFilterOptions,
        customFields: [
          {
            key: 'legacy_toggle',
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'Legacy toggle',
          },
        ],
        globalInlineFields: [
          {
            name: 'requires_postmortem',
            label: 'Requires postmortem',
            type: 'boolean',
            control: FieldType.TOGGLE,
          },
          {
            name: 'summary',
            label: 'Summary',
            type: 'keyword',
            control: FieldType.INPUT_TEXT,
          },
        ],
        templatesEnabled: true,
        isLoading: false,
      },
    });

    const keys = result.current.selectableOptions.map(({ key }) => key);
    expect(keys).toContain(`${EXTENDED_FIELD_KEY_PREFIX}requires_postmortem_as_boolean`);
    expect(keys).not.toContain(`${CUSTOM_FIELD_KEY_PREFIX}legacy_toggle`);
    expect(keys).not.toContain(`${EXTENDED_FIELD_KEY_PREFIX}summary_as_keyword`);
  });

  it('should activate global toggle filters when extendedFieldFilters has a value', () => {
    const efKey = `${EXTENDED_FIELD_KEY_PREFIX}requires_postmortem_as_boolean`;

    useCasesLocalStorageMock.mockImplementation(() => [
      [{ key: efKey, isActive: false }],
      jest.fn(),
    ]);

    const { result } = renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          extendedFieldFilters: [{ label: 'Requires postmortem', value: 'true' }],
        },
        customFields: [],
        globalInlineFields: [
          {
            name: 'requires_postmortem',
            label: 'Requires postmortem',
            type: 'boolean',
            control: FieldType.TOGGLE,
          },
        ],
        templatesEnabled: true,
        isLoading: false,
      },
    });

    expect(result.current.activeSelectableOptionKeys).toEqual([efKey]);
  });

  it('activates deep-linked extendedFieldFilters even when localStorage tracks other filters', () => {
    const efKey = `${EXTENDED_FIELD_KEY_PREFIX}requires_postmortem_as_boolean`;

    useCasesLocalStorageMock.mockImplementation(() => [
      [
        { key: 'severity', isActive: true },
        { key: 'tags', isActive: true },
      ],
      jest.fn(),
    ]);

    const { result } = renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          extendedFieldFilters: [{ label: 'Requires postmortem', value: 'true' }],
        },
        customFields: [],
        globalInlineFields: [
          {
            name: 'requires_postmortem',
            label: 'Requires postmortem',
            type: 'boolean',
            control: FieldType.TOGGLE,
          },
        ],
        templatesEnabled: true,
        isLoading: false,
      },
    });

    expect(result.current.activeSelectableOptionKeys).toEqual(
      expect.arrayContaining(['severity', 'tags', efKey])
    );
    expect(result.current.filters.map((f) => f.key)).toEqual(
      expect.arrayContaining(['severity', 'tags', efKey])
    );
  });

  it('preserves unknown deep-linked filters until global fields finish loading', () => {
    renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          extendedFieldFilters: [{ label: 'Deleted field', value: 'true' }],
        },
        customFields: [],
        globalInlineFields: [],
        areGlobalFieldsLoaded: false,
        templatesEnabled: true,
        isLoading: true,
      },
    });

    expect(onFilterOptionsChange).not.toHaveBeenCalled();
  });

  it('removes unsupported deep-linked filters after global fields load', () => {
    renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          extendedFieldFilters: [
            { label: 'Requires postmortem', value: 'true' },
            { label: 'Deleted field', value: 'true' },
            { label: 'Requires postmortem', value: 'unsupported' },
          ],
        },
        customFields: [],
        globalInlineFields: [
          {
            name: 'requires_postmortem',
            label: 'Requires postmortem',
            type: 'boolean',
            control: FieldType.TOGGLE,
          },
        ],
        areGlobalFieldsLoaded: true,
        templatesEnabled: true,
        isLoading: false,
      },
    });

    expect(onFilterOptionsChange).toHaveBeenCalledWith({
      extendedFieldFilters: [{ label: 'Requires postmortem', value: 'true' }],
    });
  });

  it('clears deep-linked filters after successfully loading an empty global field list', () => {
    renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          extendedFieldFilters: [{ label: 'Deleted field', value: 'true' }],
        },
        customFields: [],
        globalInlineFields: [],
        areGlobalFieldsLoaded: true,
        templatesEnabled: true,
        isLoading: false,
      },
    });

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ extendedFieldFilters: [] });
  });

  it('clears legacy customFields when templates become enabled', () => {
    const customFieldKey = 'legacy_toggle';

    const { rerender } = renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          customFields: {
            [customFieldKey]: { type: CustomFieldTypes.TOGGLE, options: ['on'] },
          },
        },
        customFields: [
          {
            key: customFieldKey,
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'Legacy toggle',
          },
        ],
        globalInlineFields: [] as InlineField[],
        templatesEnabled: false,
        isLoading: false,
      },
    });

    onFilterOptionsChange.mockClear();

    rerender({
      systemFilterConfig: filters,
      onFilterOptionsChange,
      isSelectorView: false,
      filterOptions: {
        ...emptyFilterOptions,
        customFields: {
          [customFieldKey]: { type: CustomFieldTypes.TOGGLE, options: ['on'] },
        },
      },
      customFields: [
        {
          key: customFieldKey,
          type: CustomFieldTypes.TOGGLE,
          required: false,
          label: 'Legacy toggle',
        },
      ],
      globalInlineFields: [
        {
          name: 'requires_postmortem',
          label: 'Requires postmortem',
          type: 'boolean',
          control: FieldType.TOGGLE,
        },
      ],
      templatesEnabled: true,
      isLoading: false,
    });

    expect(onFilterOptionsChange).toHaveBeenCalledWith({
      customFields: {
        [customFieldKey]: { type: CustomFieldTypes.TOGGLE, options: [] },
      },
    });
  });

  it('clears extendedFieldFilters when templates become disabled', () => {
    const { rerender } = renderHook(useFilterConfig, {
      initialProps: {
        systemFilterConfig: filters,
        onFilterOptionsChange,
        isSelectorView: false,
        filterOptions: {
          ...emptyFilterOptions,
          extendedFieldFilters: [{ label: 'Requires postmortem', value: 'true' }],
        },
        customFields: [],
        globalInlineFields: [
          {
            name: 'requires_postmortem',
            label: 'Requires postmortem',
            type: 'boolean',
            control: FieldType.TOGGLE,
          },
        ],
        templatesEnabled: true,
        isLoading: false,
      },
    });

    onFilterOptionsChange.mockClear();

    rerender({
      systemFilterConfig: filters,
      onFilterOptionsChange,
      isSelectorView: false,
      filterOptions: {
        ...emptyFilterOptions,
        extendedFieldFilters: [{ label: 'Requires postmortem', value: 'true' }],
      },
      customFields: [],
      globalInlineFields: [],
      templatesEnabled: false,
      isLoading: false,
    });

    expect(onFilterOptionsChange).toHaveBeenCalledWith({
      extendedFieldFilters: [],
    });
  });
});
