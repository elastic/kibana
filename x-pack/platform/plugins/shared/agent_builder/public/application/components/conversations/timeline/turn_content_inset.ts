/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';

/** The gutter between an agent turn's avatar column and its content. */
export const TURN_COLUMN_GUTTER = 's' as const;

/** The avatar column's width: one small avatar. */
export const turnAvatarColumnWidth = (euiTheme: EuiThemeComputed): string => euiTheme.size.l;

/**
 * Where an agent turn's content starts, from the timeline's edge. A message sent to a running
 * agent is set in by it, so it lines up with the turn it speaks to before and after the pickup.
 */
export const useTurnContentInset = (): string => {
  const { euiTheme } = useEuiTheme();
  return `calc(${turnAvatarColumnWidth(euiTheme)} + ${euiTheme.size[TURN_COLUMN_GUTTER]})`;
};
