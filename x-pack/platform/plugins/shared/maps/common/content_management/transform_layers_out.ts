/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import { SOURCE_TYPES } from '../constants';
import type { ESQLSourceDescriptor } from '../descriptor_types';
import type { StoredLayer } from '../../server';

export function transformLayersOut(layers: StoredLayer[]) {
  return layers.map((layer) => {
    const transformed = { ...layer };
    if ('style' in transformed && transformed.style) {
      transformed.style = convertCamelCasedKeysToSnakeCase(
        transformed.style
      ) as typeof transformed.style;
    }
    if ('sourceDescriptor' in transformed && transformed.sourceDescriptor) {
      const source = transformed.sourceDescriptor as { type?: string };
      if (source.type === SOURCE_TYPES.ESQL) {
        const { columns, dataViewId, ...restOfSource } = source as ESQLSourceDescriptor & {
          columns?: unknown;
          dataViewId?: string;
        };
        transformed.sourceDescriptor = restOfSource;
      }
    }
    return transformed;
  });
}
