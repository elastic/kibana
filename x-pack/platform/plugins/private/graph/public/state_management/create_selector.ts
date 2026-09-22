/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelectorCreator, lruMemoize } from 'reselect';

/**
 * `createSelector` configured with `lruMemoize` to keep the reselect v4
 * memoization behavior (LRU cache of size 1) instead of the v5 default
 * `weakMapMemoize`.
 */
export const createSelector = createSelectorCreator(lruMemoize);
