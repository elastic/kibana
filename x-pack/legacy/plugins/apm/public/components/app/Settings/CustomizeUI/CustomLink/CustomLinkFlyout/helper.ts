/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { isEmpty, pick } from 'lodash';
import {
  FilterOptions,
  FILTER_OPTIONS
} from '../../../../../../../../../../plugins/apm/common/custom_link_filter_options';
import { CustomLink } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_link/custom_link_types';

type FilterKey = keyof FilterOptions | '';
type FilterValue = string;
export type FilterKeyValue = [FilterKey, FilterValue];

interface FilterSelectOption {
  value: 'DEFAULT' | keyof FilterOptions;
  text: string;
}

/**
 * Converts available filters from the Custom Link to Array of filters.
 * e.g.
 * customLink = {
 *  id: '1',
 *  label: 'foo',
 *  url: 'http://www.elastic.co',
 *  service.name: 'opbeans-java',
 *  transaction.type: 'request'
 * }
 *
 * results: [['service.name', 'opbeans-java'],['transaction.type', 'request']]
 * @param customLink
 */
export const convertFiltersToArray = (
  customLink?: CustomLink
): FilterKeyValue[] => {
  if (customLink) {
    const filters = Object.entries(
      pick(customLink, FILTER_OPTIONS)
    ) as FilterKeyValue[];
    if (!isEmpty(filters)) {
      return filters;
    }
  }
  return [['', '']];
};

/**
 * Converts array of filters into object.
 * e.g.
 * filters: [['service.name', 'opbeans-java'],['transaction.type', 'request']]
 *
 * results: {
 *  'service.name': 'opbeans-java',
 *  'transaction.type': 'request'
 * }
 * @param filters
 */
export const convertFiltersToObject = (filters: FilterKeyValue[]) => {
  const convertedFilters = Object.fromEntries(
    filters
      .filter(([key, value]) => !isEmpty(key) && !isEmpty(value))
      .map(([key, value]) => [
        key,
        // Splits the value by comma, removes whitespace from both ends and filters out empty values
        value
          .split(',')
          .map(v => v.trim())
          .filter(v => v)
      ])
  );
  if (!isEmpty(convertedFilters)) {
    return convertedFilters;
  }
};

export const DEFAULT_OPTION: FilterSelectOption = {
  value: 'DEFAULT',
  text: i18n.translate(
    'xpack.apm.settings.customizeUI.customLink.flyOut.filters.defaultOption',
    { defaultMessage: 'Select field...' }
  )
};

export const filterSelectOptions: FilterSelectOption[] = [
  DEFAULT_OPTION,
  ...FILTER_OPTIONS.map(filter => ({
    value: filter as keyof FilterOptions,
    text: filter
  }))
];

/**
 * Returns the options available, removing filters already added, but keeping the selected filter.
 *
 * @param filters
 * @param selectedKey
 */
export const getSelectOptions = (
  filters: FilterKeyValue[],
  selectedKey: FilterKey
) => {
  return filterSelectOptions.filter(
    ({ value }) =>
      !filters.some(
        ([filterKey]) => filterKey === value && filterKey !== selectedKey
      )
  );
};
