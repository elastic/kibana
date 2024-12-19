/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lzString from 'lz-string';

export const encode = (state: any) => {
  try {
    const stateJSON = JSON.stringify(state);
    return lzString.compress(stateJSON);
  } catch (e) {
    throw new Error(`Could not encode state: ${e.message}`);
  }
};

export const decode = (payload: string) => {
  try {
    const stateJSON = lzString.decompress(payload) ?? 'null';
    return JSON.parse(stateJSON);
  } catch (e) {
    return null;
  }
};
