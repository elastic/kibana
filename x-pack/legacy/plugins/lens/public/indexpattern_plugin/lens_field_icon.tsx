/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';
import { FieldIcon, typeToEuiIconMap } from '../../../../../../src/plugins/kibana_react/public';
import { DataType } from '../types';
import { normalizeOperationDataType } from './utils';

export function getColorForDataType(type: string) {
  const iconMap = typeToEuiIconMap[normalizeOperationDataType(type as DataType)];
  if (iconMap) {
    return iconMap.color;
  }
  return euiPaletteColorBlind()[0];
}

export function LensFieldIcon({ type }: { type: DataType }) {
  return (
    <FieldIcon
      type={normalizeOperationDataType(type)}
      className="lnsFieldListPanel__fieldIcon"
      size="m"
      useColor
    />
  );
}
