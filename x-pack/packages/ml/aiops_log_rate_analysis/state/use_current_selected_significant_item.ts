/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from './store';
import { useAppSelector } from './hooks';

const selectSelectedSignificantItem = (s: RootState) =>
  s.logRateAnalysisTableRow.selectedSignificantItem;
const selectPinnedSignificantItem = (s: RootState) =>
  s.logRateAnalysisTableRow.pinnedSignificantItem;
const selectCurrentSelectedSignificantItem = createSelector(
  selectSelectedSignificantItem,
  selectPinnedSignificantItem,
  (selectedSignificantItem, pinnedSignificantItem) => {
    if (selectedSignificantItem) {
      return selectedSignificantItem;
    } else if (pinnedSignificantItem) {
      return pinnedSignificantItem;
    }
  }
);

export const useCurrentSelectedSignificantItem = () =>
  useAppSelector(selectCurrentSelectedSignificantItem);
