/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchableSnapshotAction } from '../../../../../common/types';

export const getDefaultRepository = (
  configs: Array<SearchableSnapshotAction | undefined>
): string => {
  if (configs.length === 0) {
    return '';
  }
  if (Boolean(configs[0]?.snapshot_repository)) {
    return configs[0]!.snapshot_repository;
  }
  return getDefaultRepository(configs.slice(1));
};
