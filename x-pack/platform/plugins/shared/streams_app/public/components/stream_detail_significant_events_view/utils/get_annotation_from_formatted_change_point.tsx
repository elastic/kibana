/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon, EuiThemeComputed } from '@elastic/eui';
import { FormattedChangePoint } from '../change_point';

export function getAnnotationFromFormattedChangePoint({
  query: { id },
  theme,
  change,
}: {
  theme: EuiThemeComputed;
  change: FormattedChangePoint;
  query: { id: string };
}) {
  const color = theme.colors[change?.color];
  return {
    color,
    icon: <EuiIcon type="dot" color={color} />,
    id: `change_point_${id}`,
    label: change.label,
    x: change.time,
  };
}
