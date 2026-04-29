/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_RESOLUTION } from '../../../../common/constants';

export function getIconSize(resolution: GRID_RESOLUTION) {
  if (resolution === GRID_RESOLUTION.COARSE) {
    return {
      minSize: 16,
      maxSize: 48,
    };
  }

  if (resolution === GRID_RESOLUTION.FINE) {
    return {
      minSize: 8,
      maxSize: 24,
    };
  }

  if (resolution === GRID_RESOLUTION.MOST_FINE) {
    return {
      minSize: 4,
      maxSize: 12,
    };
  }

  return {
    minSize: 2,
    maxSize: 6,
  };
}
