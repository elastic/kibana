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
 * Picks one colour for each model of a response, in the order of the keys. A model gets the colour
 * of a hash of its key, so it has the same colour in every response, or the next free colour of the
 * palette when another model of the response already has it. The models of a response have
 * different colours as long as the palette is big enough.
 */
export const getModelColors = (
  keys: readonly string[],
  palette: readonly string[]
): Array<string | undefined> => {
  const usedIndexes = new Set<number>();
  return keys.map((key) => {
    if (palette.length === 0) {
      return undefined;
    }
    let index = hashString(key) % palette.length;
    for (let attempt = 0; attempt < palette.length && usedIndexes.has(index); attempt++) {
      index = (index + 1) % palette.length;
    }
    usedIndexes.add(index);
    return palette[index];
  });
};
