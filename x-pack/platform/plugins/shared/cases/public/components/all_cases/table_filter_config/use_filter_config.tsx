/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetStateAction } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { mergeWith, isEqual, isEmpty } from 'lodash';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import type { CasesConfigurationUI, FilterOptions } from '../../../../common/ui';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import type { FilterConfig, FilterConfigState } from './types';
import { useCustomFieldsFilterConfig } from './use_custom_fields_filter_config';
import { useGlobalToggleFieldsFilterConfig } from './use_global_toggle_fields_filter_config';
import { deflattenCustomFieldKey, isFlattenCustomField, isFlattenExtendedField } from '../utils';

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

const shouldBeActive = ({
  filter,
  filterOptions,
  filterConfigs,
}: {
  filter: FilterConfigState;
  filterOptions: FilterOptions;
  filterConfigs?: Map<string, FilterConfig>;
}) => {
  if (isFlattenCustomField(filter.key)) {
    return (
      !filter.isActive &&
      !isEmpty(filterOptions.customFields[deflattenCustomFieldKey(filter.key)]?.options)
    );
  }

  if (isFlattenExtendedField(filter.key)) {
    return (
      !filter.isActive && hasExtendedFieldFilterValue({ filter, filterOptions, filterConfigs })
    );
  }

  return !filter.isActive && !isEmpty(filterOptions[filter.key as keyof FilterOptions]);
};

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

const deactivateNonExistingFilters = ({
  prevFilterConfigs,
  currentFilterConfigs,
  onFilterOptionsChange,
  filterOptions,
}: {
  prevFilterConfigs: Map<string, FilterConfig>;
  currentFilterConfigs: Map<string, FilterConfig>;
  onFilterOptionsChange: (params: Partial<FilterOptions>) => void;
  filterOptions: FilterOptions;
}) => {
  const removedConfigs: FilterConfig[] = [];
  const emptyOptions: Array<Partial<FilterOptions>> = [];

  [...(prevFilterConfigs?.entries() ?? [])].forEach(([filterKey, filter]) => {
    if (!currentFilterConfigs.has(filterKey)) {
      removedConfigs.push(filter);
      emptyOptions.push(filter.getEmptyOptions(filterOptions));
    }
  });

  if (emptyOptions.length > 0) {
    onFilterOptionsChange(
      mergeEmptyOptions({ emptyOptions, deactivatedConfigs: removedConfigs, filterOptions })
    );
  }
};

export const useFilterConfig = ({
  isSelectorView,
  onFilterOptionsChange,
  systemFilterConfig,
  filterOptions,
  customFields,
  globalInlineFields = [],
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

  const activeFieldFilterConfig = fieldFilterConfig.map((fieldFilter) => {
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
  });

  const filterConfigs = mergeSystemAndFieldConfigs({
    systemFilterConfig,
    fieldFilterConfig: activeFieldFilterConfig,
  });

  const [activeByFilterKey, setActiveByFilterKey] = useActiveByFilterKeyState({
    filterOptions,
    filterConfigs,
  });

  const prevFilterConfigs = usePrevious(filterConfigs) ?? new Map();

  deactivateNonExistingFilters({
    prevFilterConfigs,
    currentFilterConfigs: filterConfigs,
    onFilterOptionsChange,
    filterOptions,
  });

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

  const activeFilters = source
    .filter((filter) => filter.isActive && filterConfigs.has(filter.key))
    .map((filter) => filterConfigs.get(filter.key)) as FilterConfig[];

  const activeFilterKeys = activeFilters.map((filter) => filter.key);

  return {
    activeSelectableOptionKeys: activeFilterKeys,
    filters: activeFilters,
    onFilterConfigChange: onChange,
    selectableOptions,
  };
};
