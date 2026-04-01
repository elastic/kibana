/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TargetType } from '../../../types/profiles';
import type { ExpandWildcardsMode, TargetLookupClient } from '../client';

export interface UseTargetLookupParams {
  client: TargetLookupClient;
  enabled?: boolean;
}

export interface UseResolveIndexParams extends UseTargetLookupParams {
  query: string;
  targetType: TargetType;
  expandWildcards: ExpandWildcardsMode;
  enabled?: boolean;
}
