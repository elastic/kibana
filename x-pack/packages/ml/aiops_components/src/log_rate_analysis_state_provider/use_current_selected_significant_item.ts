/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import type { RootState } from './store';

const selectSelectedSignificantItem = (s: RootState) => s.selectedSignificantItem;
const selectPinnedSignificantItem = (s: RootState) => s.pinnedSignificantItem;
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
  useSelector(selectCurrentSelectedSignificantItem);
