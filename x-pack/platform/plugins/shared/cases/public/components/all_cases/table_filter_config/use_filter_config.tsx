/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetStateAction } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { merge, isEqual, isEmpty } from 'lodash';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import type { CasesConfigurationUI, FilterOptions } from '../../../../common/ui';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import type { FilterConfig, FilterConfigState } from './types';
import { useCustomFieldsFilterConfig } from './use_custom_fields_filter_config';
import { deflattenCustomFieldKey, isFlattenCustomField } from '../utils';

const mergeSystemAndCustomFieldConfigs = ({
  systemFilterConfig,
  customFieldsFilterConfig,
}: {
  systemFilterConfig: FilterConfig[];
  customFieldsFilterConfig: FilterConfig[];
}) => {
  const newFilterConfig = new Map(
    [...systemFilterConfig, ...customFieldsFilterConfig]
      .filter((filter) => filter.isAvailable)
      .map((filter) => [filter.key, filter])
  );

  return newFilterConfig;
};

const shouldBeActive = ({
  filter,
  filterOptions,
}: {
  filter: FilterConfigState;
  filterOptions: FilterOptions;
}) => {
  if (isFlattenCustomField(filter.key)) {
    return (
      !filter.isActive &&
      !isEmpty(filterOptions.customFields[deflattenCustomFieldKey(filter.key)]?.options)
    );
  }

  return !filter.isActive && !isEmpty(filterOptions[filter.key as keyof FilterOptions]);
};

const useActiveByFilterKeyState = ({ filterOptions }: { filterOptions: FilterOptions }) => {
  const [activeByFilterKey, setActiveByFilterKey] = useCasesLocalStorage<FilterConfigState[]>(
    LOCAL_STORAGE_KEYS.casesTableFiltersConfig,
    []
  );

  /**
   * Activates filters that aren't active but have a value in the filterOptions
   */
  const newActiveByFilterKey = [...(activeByFilterKey || [])];

  newActiveByFilterKey.forEach((filter) => {
    if (shouldBeActive({ filter, filterOptions })) {
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

const deactivateNonExistingFilters = ({
  prevFilterConfigs,
  currentFilterConfigs,
  onFilterOptionsChange,
}: {
  prevFilterConfigs: Map<string, FilterConfig>;
  currentFilterConfigs: Map<string, FilterConfig>;
  onFilterOptionsChange: (params: Partial<FilterOptions>) => void;
}) => {
  const emptyOptions: Array<Partial<FilterOptions>> = [];

  [...(prevFilterConfigs?.entries() ?? [])].forEach(([filterKey, filter]) => {
    if (!currentFilterConfigs.has(filterKey)) {
      emptyOptions.push(filter.getEmptyOptions());
    }
  });

  if (emptyOptions.length > 0) {
    const mergedEmptyOptions = merge({}, ...emptyOptions);
    onFilterOptionsChange(mergedEmptyOptions);
  }
};

export const useFilterConfig = ({
  isSelectorView,
  onFilterOptionsChange,
  systemFilterConfig,
  filterOptions,
  customFields,
  isLoading,
}: {
  isSelectorView: boolean;
  isLoading: boolean;
  onFilterOptionsChange: (params: Partial<FilterOptions>) => void;
  systemFilterConfig: FilterConfig[];
  filterOptions: FilterOptions;
  customFields: CasesConfigurationUI['customFields'];
}) => {
  /**
   * Initially we won't save any order, it will use the default config as it is defined in the system.
   * Once the user adds/removes a filter, we start saving the order and the visible state.
   */
  const [activeByFilterKey, setActiveByFilterKey] = useActiveByFilterKeyState({
    filterOptions,
  });

  const { customFieldsFilterConfig } = useCustomFieldsFilterConfig({
    isSelectorView,
    customFields,
    isLoading,
    onFilterOptionsChange,
  });

  const activeCustomFieldsConfig = customFieldsFilterConfig.map((customField) => {
    return {
      ...customField,
      isActive: Object.entries(filterOptions.customFields).find(
        ([key, _]) => key === deflattenCustomFieldKey(customField.key)
      )
        ? true
        : customField.isActive,
    };
  });

  const filterConfigs = mergeSystemAndCustomFieldConfigs({
    systemFilterConfig,
    customFieldsFilterConfig: activeCustomFieldsConfig,
  });

  const prevFilterConfigs = usePrevious(filterConfigs) ?? new Map();

  deactivateNonExistingFilters({
    prevFilterConfigs,
    currentFilterConfigs: filterConfigs,
    onFilterOptionsChange,
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

    const emptyOptions = deactivatedFilters
      .filter((key) => filterConfigs.has(key))
      .map((key) => (filterConfigs.get(key) as FilterConfig).getEmptyOptions());

    if (emptyOptions.length > 0) {
      const mergedEmptyOptions = merge({}, ...emptyOptions);
      onFilterOptionsChange(mergedEmptyOptions);
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
