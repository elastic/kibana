/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const objectToArray = <T extends object>(
  obj: Record<string, T>
): Array<T & { __id__: string }> => Object.keys(obj).map((k) => ({ ...obj[k], __id__: k }));

export const arrayToObject = <T, K extends keyof T>(array: T[], keyProp: K): Record<string, T> =>
  array.reduce<Record<string, T>>((acc, item) => {
    acc[String(item[keyProp])] = item;
    return acc;
  }, {});
