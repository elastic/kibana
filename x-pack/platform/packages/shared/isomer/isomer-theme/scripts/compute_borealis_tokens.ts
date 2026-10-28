/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getComputed } from '@elastic/eui-theme-common';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import type { BorealisTokenValues } from '../src/to_token_values';
import { toTokenValues } from '../src/to_token_values';

/** Computes Isomer's Borealis token values from the installed EUI theme, as `useEuiTheme()` would. */
export const computeBorealisTokens = (): Record<'light' | 'dark', BorealisTokenValues> => ({
  light: toTokenValues(getComputed(EuiThemeBorealis, {}, 'LIGHT')),
  dark: toTokenValues(getComputed(EuiThemeBorealis, {}, 'DARK')),
});
