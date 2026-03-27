/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME, DARK_THEME } from '@elastic/charts';

export const isDarkMode =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const baseTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;

export const transparentBackground = { background: { color: 'transparent' } };
