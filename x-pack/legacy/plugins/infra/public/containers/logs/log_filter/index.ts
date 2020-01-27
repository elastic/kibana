/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import createContainer from 'constate';
import { ReduxStateContext } from '../../../utils/redux_context';
import { logFilterSelectors as logFilterReduxSelectors } from '../../../store/local/selectors';

export const useLogFilterState = () => {
  const { local: state } = useContext(ReduxStateContext);
  const filterQuery = logFilterReduxSelectors.selectLogFilterQueryAsJson(state);
  return { filterQuery };
};

export interface LogFilterStateParams {
  filterQuery: string | null;
}

export const logFilterInitialState = {
  filterQuery: null,
};

export const LogFilterState = createContainer(useLogFilterState);
