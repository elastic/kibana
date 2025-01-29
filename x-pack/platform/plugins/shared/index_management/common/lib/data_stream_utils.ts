/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStream, DataRetention } from '../types';

export const splitSizeAndUnits = (field: string): { size: string; unit: string } => {
  let size = '';
  let unit = '';

  const result = /(\d+)(\w+)/.exec(field);
  if (result) {
    size = result[1];
    unit = result[2];
  }

  return {
    size,
    unit,
  };
};

export const serializeAsESLifecycle = (lifecycle?: DataRetention): DataStream['lifecycle'] => {
  if (!lifecycle || !lifecycle?.enabled) {
    return undefined;
  }

  const { infiniteDataRetention, value, unit } = lifecycle;

  if (infiniteDataRetention) {
    return {
      enabled: true,
    };
  }

  return {
    enabled: true,
    data_retention: `${value}${unit}`,
  };
};

export const deserializeESLifecycle = (lifecycle?: DataStream['lifecycle']): DataRetention => {
  if (!lifecycle || !lifecycle?.enabled) {
    return { enabled: false };
  }

  if (!lifecycle.data_retention) {
    return {
      enabled: true,
      infiniteDataRetention: true,
    };
  }

  const { size, unit } = splitSizeAndUnits(lifecycle.data_retention as string);

  return {
    enabled: true,
    value: Number(size),
    unit,
  };
};
