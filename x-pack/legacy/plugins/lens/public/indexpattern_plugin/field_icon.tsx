/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ICON_TYPES, palettes, EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import { DataType } from '../types';

function stringToNum(s: string) {
  return Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 1);
}

export type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export function FieldIcon({ type }: { type: DataType }) {
  const icons: Partial<Record<DataType, UnwrapArray<typeof ICON_TYPES>>> = {
    boolean: 'invert',
    date: 'calendar',
  };

  const iconType = icons[type] || ICON_TYPES.find(t => t === type) || 'empty';
  const { colors } = palettes.euiPaletteColorBlind;
  const colorIndex = stringToNum(iconType) % colors.length;

  const classes = classNames(
    'lnsFieldListPanel__fieldIcon',
    `lnsFieldListPanel__fieldIcon--${type}`
  );

  return <EuiIcon type={iconType} color={colors[colorIndex]} className={classes} />;
}
