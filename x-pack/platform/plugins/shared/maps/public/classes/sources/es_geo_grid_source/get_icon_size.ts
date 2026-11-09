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
      min_size: 16,
      max_size: 48,
    };
  }

  if (resolution === GRID_RESOLUTION.FINE) {
    return {
      min_size: 8,
      max_size: 24,
    };
  }

  if (resolution === GRID_RESOLUTION.MOST_FINE) {
    return {
      min_size: 4,
      max_size: 12,
    };
  }

  return {
    min_size: 2,
    max_size: 6,
  };
}
