/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const arrify = <T>(val: T | T[]): T[] => (Array.isArray(val) ? val : [val]);

/**
 * Utility to remove empty fields ("") from a request body.
 */
export const removeEmptyFields = <T extends object>(body: T): Partial<T> =>
  Object.entries(body).reduce((acc: Partial<T>, [key, value]): Partial<T> => {
    if (value !== '') {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {});
