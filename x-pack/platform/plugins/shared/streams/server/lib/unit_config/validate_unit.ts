/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findDuplicateUnitComponentIds, type StreamsUnit } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import type { UnitConfigHooks } from './types';

/**
 * Write-time unit checks that always run in Kibana. Semantic / OTTL / compile
 * validation is delegated to `hooks.validate` (`POST /v1/validate`).
 */
export const validateUnitForWrite = async (
  unit: StreamsUnit.Configuration,
  hooks: UnitConfigHooks = {}
): Promise<void> => {
  const duplicateIds = findDuplicateUnitComponentIds(unit);

  if (duplicateIds.length > 0) {
    const error = new StatusError(
      `Component ids must be unique within a unit. Duplicates: ${duplicateIds.join(', ')}`,
      400
    );
    error.data = { duplicate_ids: duplicateIds };
    throw error;
  }

  await hooks.validate?.(unit);
};
