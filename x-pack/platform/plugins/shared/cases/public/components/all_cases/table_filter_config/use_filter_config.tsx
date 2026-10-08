/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { SetStateAction } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { mergeWith, isEqual, isEmpty } from 'lodash';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import type { CasesConfigurationUI, FilterOptions } from '../../../../common/ui';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import type { FilterConfig, FilterConfigState } from './types';
import { useCustomFieldsFilterConfig } from './use_custom_fields_filter_config';
import { useGlobalToggleFieldsFilterConfig } from './use_global_toggle_fields_filter_config';
import { deflattenCustomFieldKey, isFlattenCustomField, isFlattenExtendedField } from '../utils';

const VALID_TOGGLE_FILTER_VALUES = new Set(['true', 'false']);

const hasCustomFieldFilterValues = (customFields: FilterOptions['customFields']): boolean =>
  Object.values(customFields ?? {}).some((field) => !isEmpty(field?.options));

const clearCustomFieldFilterValues = (
  customFields: FilterOptions['customFields']
): FilterOptions['customFields'] =>
  Object.fromEntries(
    Object.entries(customFields ?? {}).map(([key, field]) => [
      key,
      { ...field, options: [] as string[] },
    ])
  );

const mergeSystemAndFieldConfigs = ({
  systemFilterConfig,
  fieldFilterConfig,
}: {
  systemFilterConfig: FilterConfig[];
  fieldFilterConfig: FilterConfig[];
}) => {
  const newFilterConfig = new Map(
    [...systemFilterConfig, ...fieldFilterConfig]
      .filter((filter) => filter.isAvailable)
      .map((filter) => [filter.key, filter])
  );

  return newFilterConfig;
};

const hasExtendedFieldFilterValue = ({
  filter,
  filterOptions,
  filterConfigs,
}: {
  filter: FilterConfigState;
  filterOptions: FilterOptions;
  filterConfigs?: Map<string, FilterConfig>;
}): boolean => {
  const config = filterConfigs?.get(filter.key);
  const label = config?.label;
  if (label == null) {
    return false;
  }
  return (filterOptions.extendedFieldFilters ?? []).some(
    (entry) => entry.label.toLowerCase() === label.toLowerCase()
  );
};

const filterConfigHasValue = ({
  filterKey,
  filterOptions,
  filterConfigs,
}: {
  filterKey: string;
  filterOptions: FilterOptions;
  filterConfigs?: Map<string, FilterConfig>;
}): boolean => {
  if (isFlattenCustomField(filterKey)) {
    return !isEmpty(filterOptions.customFields[deflattenCustomFieldKey(filterKey)]?.options);
  }

  if (isFlattenExtendedField(filterKey)) {
    return hasExtendedFieldFilterValue({
      filter: { key: filterKey, isActive: false },
      filterOptions,
      filterConfigs,
    });
  }

  return !isEmpty(filterOptions[filterKey as keyof FilterOptions]);
};

const shouldBeActive = ({
  filter,
  filterOptions,
  filterConfigs,
}: {
  filter: FilterConfigState;
  filterOptions: FilterOptions;
  filterConfigs?: Map<string, FilterConfig>;
}) =>
  !filter.isActive && filterConfigHasValue({ filterKey: filter.key, filterOptions, filterConfigs });

const useActiveByFilterKeyState = ({
  filterOptions,
  filterConfigs,
}: {
  filterOptions: FilterOptions;
  filterConfigs: Map<string, FilterConfig>;
}) => {
  const [activeByFilterKey, setActiveByFilterKey] = useCasesLocalStorage<FilterConfigState[]>(
    LOCAL_STORAGE_KEYS.casesTableFiltersConfig,
    []
  );

  /**
   * Activates filters that aren't active but have a value in the filterOptions
   */
  const newActiveByFilterKey = [...(activeByFilterKey || [])];

  newActiveByFilterKey.forEach((filter) => {
    if (shouldBeActive({ filter, filterOptions, filterConfigs })) {
      const currentIndex = newActiveByFilterKey.findIndex((_filter) => filter.key === _filter.key);
      newActiveByFilterKey.splice(currentIndex, 1);
      newActiveByFilterKey.push({ key: filter.key, isActive: true });
    }
  });

  if (!isEqual(newActiveByFilterKey, activeByFilterKey)) {
    setActiveByFilterKey(newActiveByFilterKey);
  }

  return [newActiveByFilterKey, setActiveByFilterKey] as [
    FilterConfigState[],
    (value: SetStateAction<FilterConfigState[]>) => void
  ];
};

const replaceArrayMerge = (_objValue: unknown, srcValue: unknown) => {
  if (Array.isArray(srcValue)) {
    return srcValue;
  }
};

/**
 * Merges getEmptyOptions results. Array-shaped fields (extendedFieldFilters) must replace,
 * not index-merge. When multiple extended-field filters deactivate together, rebuild the
 * array once by removing all of their labels from the current filterOptions.
 */
const mergeEmptyOptions = ({
  emptyOptions,
  deactivatedConfigs,
  filterOptions,
}: {
  emptyOptions: Array<Partial<FilterOptions>>;
  deactivatedConfigs: FilterConfig[];
  filterOptions: FilterOptions;
}): Partial<FilterOptions> => {
  const extendedLabelsToClear = new Set(
    deactivatedConfigs
      .filter((config) => isFlattenExtendedField(config.key))
      .map((config) => config.label.toLowerCase())
  );

  if (extendedLabelsToClear.size === 0) {
    return mergeWith({}, ...emptyOptions, replaceArrayMerge);
  }

  const withoutExtended = emptyOptions.map(({ extendedFieldFilters: _ignored, ...rest }) => rest);
  const merged = mergeWith({}, ...withoutExtended, replaceArrayMerge);

  return {
    ...merged,
    extendedFieldFilters: (filterOptions.extendedFieldFilters ?? []).filter(
      (entry) => !extendedLabelsToClear.has(entry.label.toLowerCase())
    ),
  };
};

const getNonExistingFiltersCleanup = ({
  prevFilterConfigs,
  currentFilterConfigs,
  filterOptions,
}: {
  prevFilterConfigs: Map<string, FilterConfig>;
  currentFilterConfigs: Map<string, FilterConfig>;
  filterOptions: FilterOptions;
}): Partial<FilterOptions> | undefined => {
  const removedConfigs: FilterConfig[] = [];
  const emptyOptions: Array<Partial<FilterOptions>> = [];

  [...(prevFilterConfigs?.entries() ?? [])].forEach(([filterKey, filter]) => {
    if (!currentFilterConfigs.has(filterKey)) {
      removedConfigs.push(filter);
      emptyOptions.push(filter.getEmptyOptions(filterOptions));
    }
  });

  if (emptyOptions.length > 0) {
    return mergeEmptyOptions({ emptyOptions, deactivatedConfigs: removedConfigs, filterOptions });
  }
};

export const useFilterConfig = ({
  isSelectorView,
  onFilterOptionsChange,
  systemFilterConfig,
  filterOptions,
  customFields,
  globalInlineFields = [],
  areGlobalFieldsLoaded = false,
  templatesEnabled = false,
  isLoading,
}: {
  isSelectorView: boolean;
  isLoading: boolean;
  onFilterOptionsChange: (params: Partial<FilterOptions>) => void;
  systemFilterConfig: FilterConfig[];
  filterOptions: FilterOptions;
  customFields: CasesConfigurationUI['customFields'];
  globalInlineFields?: InlineField[];
  areGlobalFieldsLoaded?: boolean;
  templatesEnabled?: boolean;
}) => {
  /**
   * Initially we won't save any order, it will use the default config as it is defined in the system.
   * Once the user adds/removes a filter, we start saving the order and the visible state.
   */

  const { customFieldsFilterConfig } = useCustomFieldsFilterConfig({
    isSelectorView: isSelectorView || templatesEnabled,
    customFields,
    isLoading,
    onFilterOptionsChange,
  });

  const { globalToggleFieldsFilterConfig } = useGlobalToggleFieldsFilterConfig({
    isSelectorView: isSelectorView || !templatesEnabled,
    globalInlineFields,
    isLoading,
    onFilterOptionsChange,
  });

  const fieldFilterConfig = templatesEnabled
    ? globalToggleFieldsFilterConfig
    : customFieldsFilterConfig;

  const validGlobalToggleFilterLabels = useMemo(
    () =>
      new Set(
        globalInlineFields
          .filter((field) => field.control === FieldType.TOGGLE)
          .map((field) => (field.label ?? field.name).toLowerCase())
      ),
    [globalInlineFields]
  );

  const activeFieldFilterConfig = useMemo(
    () =>
      fieldFilterConfig.map((fieldFilter) => {
        if (isFlattenCustomField(fieldFilter.key)) {
          return {
            ...fieldFilter,
            isActive: Object.entries(filterOptions.customFields).find(
              ([key, _]) => key === deflattenCustomFieldKey(fieldFilter.key)
            )
              ? true
              : fieldFilter.isActive,
          };
        }

        if (isFlattenExtendedField(fieldFilter.key)) {
          const hasValue = (filterOptions.extendedFieldFilters ?? []).some(
            (entry) => entry.label.toLowerCase() === fieldFilter.label.toLowerCase()
          );
          return {
            ...fieldFilter,
            isActive: hasValue ? true : fieldFilter.isActive,
          };
        }

        return fieldFilter;
      }),
    [fieldFilterConfig, filterOptions]
  );

  const filterConfigs = useMemo(
    () =>
      mergeSystemAndFieldConfigs({
        systemFilterConfig,
        fieldFilterConfig: activeFieldFilterConfig,
      }),
    [activeFieldFilterConfig, systemFilterConfig]
  );

  const [activeByFilterKey, setActiveByFilterKey] = useActiveByFilterKeyState({
    filterOptions,
    filterConfigs,
  });

  const previousFilterConfigs = usePrevious(filterConfigs);

  useEffect(() => {
    const cleanupOptions: Array<Partial<FilterOptions>> = [];
    const nonExistingFiltersCleanup = getNonExistingFiltersCleanup({
      prevFilterConfigs: previousFilterConfigs ?? new Map(),
      currentFilterConfigs: filterConfigs,
      filterOptions,
    });

    if (nonExistingFiltersCleanup != null) {
      cleanupOptions.push(nonExistingFiltersCleanup);
    }

    if (templatesEnabled) {
      if (hasCustomFieldFilterValues(filterOptions.customFields)) {
        cleanupOptions.push({
          customFields: clearCustomFieldFilterValues(filterOptions.customFields),
        });
      }

      if (areGlobalFieldsLoaded) {
        const validExtendedFieldFilters = (filterOptions.extendedFieldFilters ?? []).filter(
          ({ label, value }) =>
            validGlobalToggleFilterLabels.has(label.toLowerCase()) &&
            VALID_TOGGLE_FILTER_VALUES.has(value)
        );

        if (!isEqual(validExtendedFieldFilters, filterOptions.extendedFieldFilters)) {
          cleanupOptions.push({ extendedFieldFilters: validExtendedFieldFilters });
        }
      }
    } else if ((filterOptions.extendedFieldFilters ?? []).length > 0) {
      cleanupOptions.push({ extendedFieldFilters: [] });
    }

    if (cleanupOptions.length > 0) {
      onFilterOptionsChange(mergeWith({}, ...cleanupOptions, replaceArrayMerge));
    }
  }, [
    areGlobalFieldsLoaded,
    filterConfigs,
    filterOptions,
    onFilterOptionsChange,
    previousFilterConfigs,
    templatesEnabled,
    validGlobalToggleFilterLabels,
  ]);

  const onChange = ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
    const newActiveByFilterKey = [...(activeByFilterKey || [])];
    const deactivatedFilters: string[] = [];

    // for each filter in the current state, this way we keep the order
    (activeByFilterKey || []).forEach(({ key, isActive: prevIsActive }) => {
      const currentIndex = newActiveByFilterKey.findIndex((filter) => filter.key === key);
      if (filterConfigs.has(key)) {
        const isActive = selectedOptionKeys.find((optionKey) => optionKey === key);
        if (isActive && !prevIsActive) {
          // remove/insert to the end with isActive = true
          newActiveByFilterKey.splice(currentIndex, 1);
          newActiveByFilterKey.push({ key, isActive: true });
        } else if (!isActive && prevIsActive) {
          // dont move, just update isActive = false
          deactivatedFilters.push(key);
          newActiveByFilterKey[currentIndex] = { key, isActive: false };
        }
      } else {
        // we might have in local storage a key of a field that don't exist anymore
        newActiveByFilterKey.splice(currentIndex, 1);
      }
    });

    // for each filter in the config
    filterConfigs.forEach(({ key: configKey }) => {
      // add it if its a new filter
      if (!newActiveByFilterKey.find(({ key }) => key === configKey)) {
        // first time, the current state is empty, all filters will be added
        // isActive = true if the filter is in the selectedOptionKeys
        const isActive = selectedOptionKeys.find((optionKey) => optionKey === configKey);
        if (!isActive) {
          // for system filter that is removed as first action
          deactivatedFilters.push(configKey);
        }
        newActiveByFilterKey.push({
          key: configKey,
          isActive: Boolean(isActive),
        });
      }
    });

    const deactivatedConfigs = deactivatedFilters
      .filter((key) => filterConfigs.has(key))
      .map((key) => filterConfigs.get(key) as FilterConfig);

    const emptyOptions = deactivatedConfigs.map((config) => config.getEmptyOptions(filterOptions));

    if (emptyOptions.length > 0) {
      onFilterOptionsChange(mergeEmptyOptions({ emptyOptions, deactivatedConfigs, filterOptions }));
    }

    setActiveByFilterKey(newActiveByFilterKey);
  };

  const filterConfigArray = Array.from(filterConfigs.values());
  const selectableOptions = filterConfigArray
    .map(({ key, label }) => ({
      key,
      label,
    }))
    .sort((a, b) => {
      if (a.label > b.label) return 1;
      if (a.label < b.label) return -1;
      return a.key > b.key ? 1 : -1;
    });

  const source =
    activeByFilterKey && activeByFilterKey.length > 0 ? activeByFilterKey : filterConfigArray;

  const activeFiltersByKey = new Map(
    source
      .filter((filter) => filter.isActive && filterConfigs.has(filter.key))
      .map((filter) => [filter.key, filterConfigs.get(filter.key) as FilterConfig])
  );

  // Deep-linked / URL-driven values must surface as chips even when localStorage already
  // tracks a different active set (otherwise filters apply with no way to clear them).
  filterConfigs.forEach((config, key) => {
    if (activeFiltersByKey.has(key)) {
      return;
    }
    if (filterConfigHasValue({ filterKey: key, filterOptions, filterConfigs })) {
      activeFiltersByKey.set(key, { ...config, isActive: true });
    }
  });

  const activeFilters = Array.from(activeFiltersByKey.values());
  const activeFilterKeys = activeFilters.map((filter) => filter.key);

  return {
    activeSelectableOptionKeys: activeFilterKeys,
    filters: activeFilters,
    onFilterConfigChange: onChange,
    selectableOptions,
  };
};
