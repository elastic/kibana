/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActivityParams } from './types';

/**
 * Whether any of the user activity filters (type, author, search) are
 * currently applied. Derived from `params` (the applied/committed state)
 * rather than any in-progress UI input, so it stays consistent with what's
 * actually driving the rendered results.
 */
export const hasActiveUserActivityFilter = (params: UserActivityParams): boolean =>
  Boolean(params.type !== 'all' || params.author || params.search);
