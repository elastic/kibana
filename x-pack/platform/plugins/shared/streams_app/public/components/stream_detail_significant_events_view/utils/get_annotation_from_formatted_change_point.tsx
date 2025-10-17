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
import { ChangePointSummary } from '../change_point_summary';

export function getAnnotationFromFormattedChangePoint({
  query: { id },
  theme,
  change,
  xFormatter,
}: {
  theme: EuiThemeComputed;
  change: FormattedChangePoint;
  query: { id: string };
  xFormatter: TickFormatter;
}) {
  const color = theme.colors[change?.color];
  return {
    color,
    icon: <EuiIcon type="dot" color={color} />,
    id: `change_point_${id}`,
    label: <ChangePointSummary xFormatter={xFormatter} change={change} />,
    x: change.time,
  };
}
