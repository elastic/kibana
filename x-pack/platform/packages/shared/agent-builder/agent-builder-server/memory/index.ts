/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  MemoryStart,
  ScopedShortTermMemoryClient,
  ShortTermMemoryConsolidateParams,
  ShortTermMemoryConsolidateResult,
  ShortTermMemoryContent,
  ShortTermMemoryCreateParams,
  ShortTermMemoryDecayParams,
  ShortTermMemoryDecayResult,
  ShortTermMemoryListParams,
  ShortTermMemoryMerge,
  ShortTermMemoryOwnerGroup,
  ShortTermMemoryOwnerListParams,
  ShortTermMemoryPromotionListParams,
  ShortTermMemorySearchParams,
  ShortTermMemorySystemClient,
} from './types';
export {
  ShortTermMemoryIdentityError,
  ShortTermMemoryNotFoundError,
  isShortTermMemoryError,
} from './errors';
