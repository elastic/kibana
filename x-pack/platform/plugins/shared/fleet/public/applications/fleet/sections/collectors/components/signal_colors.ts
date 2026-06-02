/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui-theme-common';

type VisColorKey = keyof EuiThemeComputed['colors']['vis'];

export const SIGNAL_VIS_COLOR_KEYS: Record<string, [VisColorKey, VisColorKey]> = {
  logs: ['euiColorVisBehindText9', 'euiColorVisText9'],
  metrics: ['euiColorVisBehindText1', 'euiColorVisText1'],
  traces: ['euiColorVisBehindText3', 'euiColorVisText3'],
};

export const getSignalBadgeColor = (
  visColors: EuiThemeComputed['colors']['vis'],
  signal: string
): [string, string] => {
  const entry = SIGNAL_VIS_COLOR_KEYS[signal];
  if (!entry) return ['hollow', 'default'];
  return [visColors[entry[0]], visColors[entry[1]]];
};
