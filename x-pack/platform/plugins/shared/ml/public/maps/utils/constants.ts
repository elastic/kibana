/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ML_ANOMALY_LAYERS = {
  TYPICAL: 'typical',
  ACTUAL: 'actual',
  TYPICAL_TO_ACTUAL: 'typical to actual',
} as const;

export type MlAnomalyLayersType = (typeof ML_ANOMALY_LAYERS)[keyof typeof ML_ANOMALY_LAYERS];

export const TYPICAL_STYLE = {
  type: 'VECTOR',
  properties: {
    fillColor: {
      type: 'STATIC',
      options: {
        color: '#98A2B2',
      },
    },
    lineColor: {
      type: 'STATIC',
      options: {
        color: '#fff',
      },
    },
    lineWidth: {
      type: 'STATIC',
      options: {
        size: 2,
      },
    },
    iconSize: {
      type: 'STATIC',
      options: {
        size: 6,
      },
    },
  },
};
