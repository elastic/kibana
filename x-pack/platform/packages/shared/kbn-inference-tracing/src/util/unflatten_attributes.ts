/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { AttributeValue } from '@opentelemetry/api';

export function unflattenAttributes(
  flat: Record<string, AttributeValue | undefined>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in flat) {
    if (Object.hasOwn(flat, key)) {
      // split on dot; numeric segments cause array creation
      set(result, key.split('.'), flat[key]);
    }
  }

  return result;
}
