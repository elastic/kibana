/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import objectHash from 'object-hash';
export function getEntityHash(
  entity: string,
  className: string,
  normalize: boolean = false
): string {
  const textForHash = normalize ? entity.toLowerCase() : entity;
  return objectHash({ entity: textForHash, class_name: className });
}
