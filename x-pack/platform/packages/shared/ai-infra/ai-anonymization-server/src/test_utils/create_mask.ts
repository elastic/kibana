/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic mask generator for tests. Mirrors the production hash-based
 * mask format (`ENTITY_CLASS_<hex>`) without pulling in the real crypto deps.
 */
export function createMask(entityClass: string, value: string) {
  return `${entityClass}_${Buffer.from(value).toString('hex').slice(0, 40)}`;
}
