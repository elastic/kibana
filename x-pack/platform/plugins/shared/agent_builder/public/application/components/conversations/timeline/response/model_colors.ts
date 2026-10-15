/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HASH_MODULUS = 2 ** 31 - 1;

const hashString = (value: string): number => {
  let hash = 7;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % HASH_MODULUS;
  }
  return hash;
};

/**
 * Gives each key a colour of the palette. The colour comes from a hash of the key, so a model has
 * the same colour in every response. Keys landing on the same colour are moved to the next free
 * one, as long as the palette has colours left.
 */
export const assignModelColors = (
  keys: readonly string[],
  palette: readonly string[]
): Record<string, string> => {
  if (palette.length === 0) {
    return {};
  }

  const usedIndexes = new Set<number>();
  const colors: Record<string, string> = {};
  for (const key of [...new Set(keys)].sort()) {
    let index = hashString(key) % palette.length;
    while (usedIndexes.has(index) && usedIndexes.size < palette.length) {
      index = (index + 1) % palette.length;
    }
    usedIndexes.add(index);
    colors[key] = palette[index];
  }
  return colors;
};
