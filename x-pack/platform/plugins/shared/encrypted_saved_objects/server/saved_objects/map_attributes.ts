/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

export function mapAttributes<T>(obj: SavedObjectUnsanitizedDoc<T>, mapper: (attributes: T) => T) {
  return Object.assign(obj, {
    attributes: mapper(obj.attributes),
  });
}
