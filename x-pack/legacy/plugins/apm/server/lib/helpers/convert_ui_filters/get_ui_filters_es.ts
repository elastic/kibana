/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { ESFilter } from 'elasticsearch';
import { UIFilters } from '../../../../typings/ui-filters';
import { getEnvironmentUiFilterES } from './get_environment_ui_filter_es';
import { getKueryUiFilterES } from './get_kuery_ui_filter_es';

export async function getUiFiltersES(server: Server, uiFilters: UIFilters) {
  const kuery = await getKueryUiFilterES(server, uiFilters.kuery);
  const environment = getEnvironmentUiFilterES(uiFilters.environment);

  // remove undefined items from list
  const filters = [kuery, environment].filter(filter => !!filter) as ESFilter[];
  return filters;
}
