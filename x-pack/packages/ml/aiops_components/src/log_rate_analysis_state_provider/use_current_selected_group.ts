/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import type { RootState } from './store';

const selectSelectedGroup = (s: RootState) => s.selectedGroup;
const selectPinnedGroup = (s: RootState) => s.pinnedGroup;
const selectCurrentSelectedGroup = createSelector(
  selectSelectedGroup,
  selectPinnedGroup,
  (selectedGroup, pinnedGroup) => {
    if (selectedGroup) {
      return selectedGroup;
    } else if (pinnedGroup) {
      return pinnedGroup;
    }
  }
);

export const useCurrentSelectedGroup = () => useSelector(selectCurrentSelectedGroup);
