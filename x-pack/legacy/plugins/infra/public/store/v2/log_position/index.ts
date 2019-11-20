/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { ReduxStateContext } from '../../../utils/redux_context';
import { logPositionSelectors as logPositionReduxSelectors } from '../../../store/local/selectors';

export const useLogPositionStore = () => {
  const state = useContext(ReduxStateContext);
  const timeKey = logPositionReduxSelectors.selectVisibleMidpointOrTarget(state.local);
  return { timeKey };
};

export const logPositionInitialState = {
  timeKey: null,
};
