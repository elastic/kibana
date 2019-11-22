/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { ReduxStateContext } from '../../../utils/redux_context';
import { SerializedFilterQuery } from '../../local/log_filter';
import { logFilterSelectors as logFilterReduxSelectors } from '../../../store/local/selectors';

export const useLogFilterStore = () => {
  const { local: state } = useContext(ReduxStateContext);
  const filterQuery = logFilterReduxSelectors.selectLogFilterQueryAsJson(state);
  return { filterQuery } as LogFilterState;
};

export interface LogFilterState {
  filterQuery: SerializedFilterQuery | null;
}

export const logFilterInitialState = {
  filterQuery: null,
};
