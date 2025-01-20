/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error untyped local
import { getState, getStore } from '../state/store';
import { State } from '../../types';
import { getGlobalFilters, getWorkpadVariablesAsObject } from '../state/selectors/workpad';
// @ts-expect-error untyped local
import { setFilter } from '../state/actions/filters';

class FiltersService {
  getFilters(state: State = getState()) {
    return getGlobalFilters(state);
  }

  updateFilter(filterId: string, filterExpression: string) {
    const { dispatch } = getStore();
    dispatch(setFilter(filterExpression, filterId));
  }

  getFiltersContext(state: State = getState()) {
    const variables = getWorkpadVariablesAsObject(state);
    return { variables };
  }
}

let canvasFiltersService: FiltersService;

export const getCanvasFiltersService = () => {
  if (!canvasFiltersService) {
    canvasFiltersService = new FiltersService();
  }
  return canvasFiltersService;
};
