/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ILicense } from '@kbn/licensing-types';

import type { LicenseState } from '../types';

/** Extracts the serializable license fields kept in the store. */
export const toLicenseState = ({
  type,
  expiryDateInMillis,
  isActive,
}: LicenseState): LicenseState => ({ type, expiryDateInMillis, isActive });

const getInitialState = (): LicenseState | null => null;

const licenseSlice = createSlice({
  name: 'license',
  initialState: getInitialState,
  reducers: {
    addLicense: {
      reducer: (_state, { payload }: PayloadAction<LicenseState>) => payload,
      prepare: (license: ILicense) => ({ payload: toLicenseState(license) }),
    },
  },
});

export const { addLicense } = licenseSlice.actions;
export const license = licenseSlice.reducer;
