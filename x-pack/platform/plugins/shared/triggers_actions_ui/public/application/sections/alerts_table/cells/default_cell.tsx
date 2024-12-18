/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CellComponentProps } from '../types';

const DefaultCellComponent: React.FC<CellComponentProps> = ({ columnId, alert }) => {
  const value = (alert && alert[columnId]) ?? [];

  if (Array.isArray(value)) {
    return <>{value.length ? value.join(', ') : '--'}</>;
  }

  return <>{value}</>;
};

DefaultCellComponent.displayName = 'DefaultCell';

export const DefaultCell = memo(DefaultCellComponent);
