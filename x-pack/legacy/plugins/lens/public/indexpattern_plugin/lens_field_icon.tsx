/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ICON_TYPES, palettes } from '@elastic/eui';
import classNames from 'classnames';
import { FieldIcon } from '../../../../../../src/plugins/kibana_react/public';
import { DataType } from '../types';

function stringToNum(s: string) {
  return Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 1);
}

function getIconForDataType(dataType: string) {
  const icons: Partial<Record<string, UnwrapArray<typeof ICON_TYPES>>> = {
    boolean: 'invert',
    date: 'calendar',
    geo_point: 'globe',
    ip: 'storage',
  };
  return icons[dataType] || ICON_TYPES.find(t => t === dataType) || 'document';
}

export function getColorForDataType(type: string) {
  const iconType = getIconForDataType(type);
  const { colors } = palettes.euiPaletteColorBlind;
  const colorIndex = stringToNum(iconType) % colors.length;
  return colors[colorIndex];
}

export type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export function LensFieldIcon({ type }: { type: DataType }) {
  const classes = classNames(
    'lnsFieldListPanel__fieldIcon',
    `lnsFieldListPanel__fieldIcon--${type}`
  );

  return <FieldIcon type={type} className={classes} size={'m'} useColor />;
}
