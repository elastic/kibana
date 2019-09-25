/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from '@hapi/hapi';
import { ESFilter } from 'elasticsearch';
import { UIFilters } from '../../../../typings/ui-filters';
import { getEnvironmentUiFilterES } from './get_environment_ui_filter_es';
import { getKueryUiFilterES } from './get_kuery_ui_filter_es';
import {
  localUIFilters,
  localUIFilterNames
} from '../../ui_filters/local_ui_filters/config';

export async function getUiFiltersES(server: Server, uiFilters: UIFilters) {
  const { kuery, environment, ...localFilterValues } = uiFilters;

  const mappedFilters = localUIFilterNames
    .filter(name => name in localFilterValues)
    .map(filterName => {
      const field = localUIFilters[filterName];
      const value = localFilterValues[filterName];
      return {
        terms: {
          [field.fieldName]: value
        }
      };
    }) as ESFilter[];

  // remove undefined items from list
  const esFilters = [
    await getKueryUiFilterES(server, uiFilters.kuery),
    getEnvironmentUiFilterES(uiFilters.environment)
  ]
    .filter(filter => !!filter)
    .concat(mappedFilters) as ESFilter[];

  return esFilters;
}
