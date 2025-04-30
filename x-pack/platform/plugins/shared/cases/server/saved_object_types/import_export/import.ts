/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsImportHookResult } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';
import { createCaseError } from '../../common/error';

export function handleImport({
  objects,
  logger,
}: {
  objects: Array<SavedObject<CasePersistedAttributes>>;
  logger: Logger;
}): SavedObjectsImportHookResult {
  const hasObjectsWithIncrementalId = objects.some((obj) => !!obj.attributes.incremental_id);
  if (hasObjectsWithIncrementalId) {
    throw createCaseError({
      message: 'Remove `incremental_id` from cases before importing',
      logger,
    });
  } else {
    return {};
  }
}
