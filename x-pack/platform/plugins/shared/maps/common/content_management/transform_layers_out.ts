/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Writable } from '@kbn/utility-types';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import { SOURCE_TYPES } from '../constants';
import type { ESQLSourceDescriptor, LayerDescriptor } from '../descriptor_types';

/** Pre 9.4 vector style keys were stored in camelCase; convert them to snake_case */
function transformVectorStyleKeysOut(layer: Writable<Partial<LayerDescriptor>>) {
  const style = layer.style as { type?: string; __styleMeta?: unknown } | undefined;
  if (!style || typeof style !== 'object' || style.type !== 'VECTOR') return layer;
  // style meta is keyed by user field names and is not part of the renamed schema
  const { __styleMeta, ...rest } = style;
  return {
    ...layer,
    style: {
      ...convertCamelCasedKeysToSnakeCase(rest),
      ...(__styleMeta ? { __styleMeta } : {}),
    },
  } as Writable<Partial<LayerDescriptor>>;
}

export function transformLayersOut(layers: Writable<Partial<LayerDescriptor>>[]) {
  return layers.map((originalLayer) => {
    const layer = transformVectorStyleKeysOut(originalLayer);
    if ('sourceDescriptor' in layer && layer.sourceDescriptor) {
      const source = layer.sourceDescriptor as { type?: string };
      if (source.type === SOURCE_TYPES.ESQL) {
        const { columns, dataViewId, ...restOfSource } = source as ESQLSourceDescriptor & {
          columns?: unknown;
          dataViewId?: string;
        };
        layer.sourceDescriptor = restOfSource;
      }
    }
    return layer;
  });
}
