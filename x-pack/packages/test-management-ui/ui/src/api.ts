/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const api = {
  get: async <T = unknown>(path: string): Promise<T> => {
    const res = await fetch(path);
    return res.json() as Promise<T>;
  },
  post: async <T = unknown>(path: string, body: unknown = {}): Promise<T> => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<T>;
  },
};
