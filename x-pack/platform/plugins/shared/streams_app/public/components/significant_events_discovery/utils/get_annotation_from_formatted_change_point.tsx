/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import type { TickFormatter } from '@elastic/charts';
import type { FormattedChangePoint } from './change_point';
import { ChangePointSummary } from '../components/change_point_summary/change_point_summary';

export function getAnnotationFromFormattedChangePoint({
  theme,
  time,
  changes,
  xFormatter,
}: {
  theme: EuiThemeComputed;
  time: number;
  changes: FormattedChangePoint[];
  xFormatter: TickFormatter;
}) {
  const change = changes[0];
  const color = theme.colors[change.color];
  return {
    color,
    icon: <EuiIcon type="dot" color={color} />,
    id: `change_point_${time}`,
    label: <ChangePointSummary xFormatter={xFormatter} changes={changes} />,
    x: time,
  };
}
