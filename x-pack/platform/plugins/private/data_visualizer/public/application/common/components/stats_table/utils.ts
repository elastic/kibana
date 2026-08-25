/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileBasedFieldVisConfig } from './types';

export const getTFPercentage = (config: FileBasedFieldVisConfig) => {
  const { stats } = config;
  if (stats === undefined) return null;
  const { count } = stats;
  // use stats from index based config
  let { trueCount, falseCount } = stats;

  // use stats from file based find structure results
  if (stats.trueCount === undefined || stats.falseCount === undefined) {
    if (config?.stats?.topValues) {
      config.stats.topValues.forEach((doc) => {
        if (doc.doc_count !== undefined) {
          if (doc.key.toString().toLowerCase() === 'false') {
            falseCount = doc.doc_count;
          }
          if (doc.key.toString().toLowerCase() === 'true') {
            trueCount = doc.doc_count;
          }
        }
      });
    }
  }
  if (count === undefined || trueCount === undefined || falseCount === undefined) return null;
  return {
    count,
    trueCount,
    falseCount,
  };
};

// Map of DataVisualizerTable breakpoints specific to the table component
// Note that the table width is not always the full width of the browser window
const TABLE_BREAKPOINTS = {
  small: 700,
  medium: 1000,
  large: Infinity, // default
};
export const calculateTableColumnsDimensions = (width?: number) => {
  const defaultSettings = {
    expander: '40px',
    type: '75px',
    docCount: '225px',
    distinctValues: '225px',
    distributions: '225px',
    showIcon: true,
    breakPoint: 'large',
  };
  if (width === undefined) return defaultSettings;
  if (width <= TABLE_BREAKPOINTS.small) {
    return {
      expander: '25px',
      type: '40px',
      docCount: 'auto',
      distinctValues: 'auto',
      distributions: 'auto',
      showIcon: false,
      breakPoint: 'small',
    };
  }
  if (width <= TABLE_BREAKPOINTS.medium) {
    return {
      expander: '25px',
      type: '40px',
      docCount: 'auto',
      distinctValues: 'auto',
      distributions: 'auto',
      showIcon: false,
      breakPoint: 'medium',
    };
  }
  return defaultSettings;
};
