/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../constants';

// Layers are in stored (camelCase) format
export function transformLayersOut(layers: Array<Record<string, unknown>>) {
  return layers.map((layer) => {
    if ('sourceDescriptor' in layer && layer.sourceDescriptor) {
      const source = layer.sourceDescriptor as { type?: string };
      if (source.type === SOURCE_TYPES.ESQL) {
        const { columns, dataViewId, ...restOfSource } = source as {
          columns?: unknown;
          dataViewId?: string;
        };
        layer.sourceDescriptor = restOfSource;
      }
    }
    return layer;
  });
}
