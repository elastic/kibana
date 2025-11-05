/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';

export function getEntityMask(entity: { class_name: string; value: string }) {
  const hash = objectHash({
    value: entity.value,
    class_name: entity.class_name,
  });
  return `${entity.class_name}_${hash}`;
}
