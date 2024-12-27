/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const renameKeys = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  keysMap: Record<keyof T, keyof U>,
  obj: Record<string, unknown>
): T =>
  Object.keys(obj).reduce((acc, key) => {
    acc[(keysMap[key] || key) as keyof T] = obj[key] as T[keyof T];
    return acc;
  }, {} as T);
