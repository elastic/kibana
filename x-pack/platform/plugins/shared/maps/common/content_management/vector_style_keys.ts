/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase } from 'lodash';
import { VECTOR_STYLES } from '../constants';

/**
 * Vector style property keys are persisted in camelCase (pre 9.4 format). In memory and in the API
 * they are snake_case. Only these known keys are renamed; nested keys are left untouched.
 */
const SNAKE_TO_CAMEL = new Map<string, string>(
  Object.values(VECTOR_STYLES).map((snakeKey) => [snakeKey, camelCase(snakeKey)])
);
const CAMEL_TO_SNAKE = new Map<string, string>(
  Array.from(SNAKE_TO_CAMEL.entries()).map(([snakeKey, camelKey]) => [camelKey, snakeKey])
);

function renameStyleProperties(layer: any, keyMap: Map<string, string>) {
  const properties = layer?.style?.properties;
  if (!properties || typeof properties !== 'object') return layer;
  const renamed: Record<string, unknown> = {};
  Object.keys(properties).forEach((key) => {
    renamed[keyMap.get(key) ?? key] = properties[key];
  });
  return { ...layer, style: { ...layer.style, properties: renamed } };
}

/** Converts persisted camelCase vector style keys to snake_case */
export function transformVectorStyleKeysOut<T>(layer: T): T {
  return renameStyleProperties(layer, CAMEL_TO_SNAKE);
}

/** Converts snake_case vector style keys to the persisted camelCase keys */
export function transformVectorStyleKeysIn<T>(layer: T): T {
  return renameStyleProperties(layer, SNAKE_TO_CAMEL);
}
