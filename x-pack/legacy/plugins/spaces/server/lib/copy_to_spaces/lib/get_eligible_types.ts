/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsService } from 'src/core/server';

export function getEligibleTypes({ types, schema }: Pick<SavedObjectsService, 'schema' | 'types'>) {
  return types.filter(type => !schema.isNamespaceAgnostic(type));
}
