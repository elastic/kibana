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
 * Picks the colour of a model from a hash of its key, so a model has the same colour in every
 * response. Two models of a response can share a colour: the palette is small, and avoiding it would
 * make a colour depend on the other models of the response.
 */
export const getModelColor = (key: string, palette: readonly string[]): string | undefined =>
  palette.length === 0 ? undefined : palette[hashString(key) % palette.length];
