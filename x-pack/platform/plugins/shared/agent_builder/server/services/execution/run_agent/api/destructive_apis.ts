/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutoApprovedApi } from '@kbn/agent-builder-common';
import { isApiWildcardSelector } from '@kbn/agent-builder-common/apis/known_apis';
import { loadApi } from './load_api';

export interface DestructiveApiPartition {
  destructive: AutoApprovedApi[];
  nonDestructive: AutoApprovedApi[];
}

/**
 * Splits pre-approval selectors by whether they can reach an operation that changes state.
 *
 * @param apis - Target and selector pairs to split, in caller order.
 * @returns The selectors to keep and the read-only identifiers to drop, each preserving input order.
 */
export const partitionDestructiveApis = async (
  apis: readonly AutoApprovedApi[]
): Promise<DestructiveApiPartition> => {
  const classified = await Promise.all(
    apis.map(async (entry) => {
      if (isApiWildcardSelector(entry.api)) {
        return { entry, destructive: true };
      }
      const result = await loadApi(entry.target, entry.api);
      return {
        entry,
        destructive: result.status === 'loaded' ? result.loaded.definition.destructive : true,
      };
    })
  );

  return {
    destructive: classified.filter((item) => item.destructive).map(({ entry }) => entry),
    nonDestructive: classified.filter((item) => !item.destructive).map(({ entry }) => entry),
  };
};
