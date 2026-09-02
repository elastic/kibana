/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CollectionStateRef } from '../screens/home/card_utils';
import { readReturnParams, type ReturnParams } from './return_params';

export function buildPackageCardNavigateState({
  search,
  fromIntegrations,
  fromCollection,
}: {
  search: string;
  fromIntegrations?: string;
  fromCollection?: CollectionStateRef;
}): {
  fromIntegrations?: string;
  fromCollection?: CollectionStateRef;
  catalogReturn?: ReturnParams;
} {
  const catalogReturn = readReturnParams(search);
  return {
    fromIntegrations,
    ...(fromCollection ? { fromCollection } : {}),
    ...(catalogReturn ? { catalogReturn } : {}),
  };
}
