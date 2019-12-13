/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import createContainer from 'constate';
import { ReduxStateContext } from '../../../utils/redux_context';
import { logPositionSelectors as logPositionReduxSelectors } from '../../../store/local/selectors';
import { TimeKey } from '../../../../common/time';

export const useLogPositionState = () => {
  const { local: state } = useContext(ReduxStateContext);
  const timeKey = logPositionReduxSelectors.selectVisibleMidpointOrTarget(state);
  const pages = logPositionReduxSelectors.selectPagesBeforeAndAfter(state);
  const isAutoReloading = logPositionReduxSelectors.selectIsAutoReloading(state);
  return { timeKey, isAutoReloading, ...pages };
};

export interface LogPositionStateParams {
  timeKey: TimeKey | null;
  pagesAfterEnd: number | null;
  pagesBeforeStart: number | null;
  isAutoReloading: boolean;
}

export const logPositionInitialState = {
  timeKey: null,
  pagesAfterEnd: null,
  pagesBeforeStart: null,
  isAutoReloading: false,
};

export const LogPositionState = createContainer(useLogPositionState);
