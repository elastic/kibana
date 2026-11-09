/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase } from 'lodash';
import { VECTOR_STYLES } from '../constants';

/**
 * Vector style keys are persisted in camelCase (pre 9.4 format). In memory and in the API they are
 * snake_case. This converts snake_case keys back to the persisted camelCase. Only the known keys
 * below are renamed, and only inside `style`.
 */
const NESTED_STYLE_KEYS = [
  'isTimeAware',
  'customColorRamp',
  'useCustomColorRamp',
  'dataMappingFunction',
  'colorCategory',
  'customColorPalette',
  'useCustomColorPalette',
  'otherCategoryColor',
  'fieldMetaOptions',
  'isEnabled',
  'useLayerZoomRange',
  'minZoom',
  'maxZoom',
  'iconSource',
  'iconPaletteId',
  'customIconStops',
  'useCustomIconMap',
  'minSize',
  'maxSize',
];

const SNAKE_TO_CAMEL = new Map<string, string>(
  [...Object.values(VECTOR_STYLES), ...NESTED_STYLE_KEYS.map((key) => snakeCaseKey(key))].map(
    (snakeKey) => [snakeKey, camelCase(snakeKey)]
  )
);

function snakeCaseKey(key: string) {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function renameKeysDeep(value: unknown, keyMap: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => renameKeysDeep(item, keyMap));
  if (value === null || typeof value !== 'object') return value;
  const renamed: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, child]) => {
    renamed[keyMap.get(key) ?? key] = renameKeysDeep(child, keyMap);
  });
  return renamed;
}

function renameStyleKeys(layer: any, keyMap: Map<string, string>) {
  const style = layer?.style;
  if (!style || typeof style !== 'object' || style.type !== 'VECTOR') return layer;
  const { __styleMeta, ...rest } = style;
  return {
    ...layer,
    style: {
      ...(renameKeysDeep(rest, keyMap) as object),
      // style meta is keyed by user field names and is not part of the renamed schema
      ...(__styleMeta ? { __styleMeta } : {}),
    },
  };
}

/** Converts snake_case vector style keys to the persisted camelCase keys */
export function transformVectorStyleKeysIn<T>(layer: T): T {
  return renameStyleKeys(layer, SNAKE_TO_CAMEL);
}
