/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsImportHookResult } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';

export function handleImport({
  objects,
}: {
  objects: Array<SavedObject<CasePersistedAttributes>>;
}): SavedObjectsImportHookResult {
  const hasObjectsWithIncrementalId = objects.some(
    (obj) => obj.attributes.incremental_id !== undefined
  );
  if (hasObjectsWithIncrementalId) {
    return {
      warnings: [
        {
          type: 'simple',
          message: 'The `incremental_id` field is not supported on importing.',
        },
      ],
    };
  } else {
    return {};
  }
}
