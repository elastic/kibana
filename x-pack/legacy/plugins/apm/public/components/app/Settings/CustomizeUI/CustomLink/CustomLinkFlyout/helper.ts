/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { isEmpty, pick } from 'lodash';
import {
  FilterOptionsType,
  filterOptions
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../../../../plugins/apm/server/routes/settings/custom_link';
import { CustomLink } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_link/custom_link_types';

export type Filters = Array<[keyof FilterOptionsType | '', string]>;

interface FilterSelectOption {
  value: 'DEFAULT' | keyof FilterOptionsType;
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
export const convertFiltersToArray = (customLink?: CustomLink): Filters => {
  if (customLink) {
    const filters = Object.entries(pick(customLink, filterOptions)) as Filters;
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
export const convertFiltersToObject = (filters: Filters) => {
  const convertedFilters = Object.fromEntries(
    filters.filter(([key, value]) => !isEmpty(key) && !isEmpty(value))
  );
  if (!isEmpty(convertedFilters)) {
    return convertedFilters;
  }
};

export const DEFAULT_OPTION: FilterSelectOption = {
  value: 'DEFAULT',
  text: i18n.translate(
    'xpack.apm.settings.customizeUI.customLink.flyOut.filters.defaultOption',
    { defaultMessage: 'Select fields...' }
  )
};

export const filterSelectOptions: FilterSelectOption[] = [
  DEFAULT_OPTION,
  ...filterOptions.map(filter => ({
    value: filter as keyof FilterOptionsType,
    text: filter
  }))
];

/**
 * Returns the options available, removing filters already added, but keeping the selected filter.
 *
 * @param filters
 * @param idx
 */
export const getSelectOptions = (filters: Filters, idx: number) => {
  return filterSelectOptions.filter(option => {
    const indexUsedFilter = filters.findIndex(
      filter => filter[0] === option.value
    );
    // Filter out all items already added, besides the one selected in the current filter.
    return indexUsedFilter === -1 || idx === indexUsedFilter;
  });
};
