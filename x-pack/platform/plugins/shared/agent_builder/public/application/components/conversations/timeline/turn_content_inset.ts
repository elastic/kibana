/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';

export const TURN_COLUMN_GUTTER = 's' as const;

export const turnAvatarColumnWidth = (euiTheme: EuiThemeComputed): string => euiTheme.size.l;

/** Shared inset for agent content and pending steers. */
export const useTurnContentInset = (): string => {
  const { euiTheme } = useEuiTheme();
  return `calc(${turnAvatarColumnWidth(euiTheme)} + ${euiTheme.size[TURN_COLUMN_GUTTER]})`;
};
