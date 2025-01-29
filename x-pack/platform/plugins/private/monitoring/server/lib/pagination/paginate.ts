/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function paginate<T>({ size, index }: { size: number; index: number }, data: T[]): T[] {
  const start = index * size;
  return data.slice(start, start + size);
}
