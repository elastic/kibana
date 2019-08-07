/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { indexPatternService } from '../kibana_services';
import { isFilterPinned } from '@kbn/es-query';
import { compareFilters } from '../../../../../../src/legacy/core_plugins/data/public/filter/filter_manager/lib/compare_filters';
import { mapAndFlattenFilters } from '../../../../../../src/legacy/core_plugins/data/public/filter/filter_manager/lib/map_and_flatten_filters'; // eslint-disable-line max-len
import { uniqFilters } from '../../../../../../src/legacy/core_plugins/data/public/filter/filter_manager/lib/uniq_filters';

export function getInitialFilters({
  mapStateJSON,
  appFilters = [],
  globalFilters = [],
}) {

  let savedObjectFilters = [];
  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.filters) {
      savedObjectFilters = mapState.filters;
    }
  }

  return [...globalFilters, ...appFilters, ...savedObjectFilters];
}

export function partitionFilters(filters = []) {
  return {
    globalFilters: filters.filter(filterPill => {
      return isFilterPinned(filterPill);
    }),
    appFilters: filters.filter(filterPill => {
      return !isFilterPinned(filterPill);
    })
  };
}

export async function prepareFilters(filters) {
  return mergeIncomingFilters(await mapAndFlattenFilters(indexPatternService, filters));
}

// logic extracted from mergeIncomingFilters.filter_manager.ts
function mergeIncomingFilters(filters) {
  const { globalFilters, appFilters } = partitionFilters(filters);

  // existing globalFilters are mutated by appFilters
  _.each(appFilters, function (filter, i) {
    const match = _.find(globalFilters, function (globalFilter) {
      return compareFilters(globalFilter, filter);
    });

    // no match, do nothing
    if (!match) return;

    // matching filter in globalState, update global and remove from appState
    _.assign(match.meta, filter.meta);
    appFilters.splice(i, 1);
  });

  return uniqFilters(appFilters.reverse().concat(globalFilters.reverse())).reverse();
}
