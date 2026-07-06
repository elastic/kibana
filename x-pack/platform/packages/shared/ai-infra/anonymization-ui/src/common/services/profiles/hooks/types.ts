/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilesListQuery, ProfilesQueryContext } from '../../../types/profiles';
import type { AnonymizationProfilesClient } from '../client';

export interface UseProfilesParams {
  client: AnonymizationProfilesClient;
  context: ProfilesQueryContext;
}

export interface UseFindProfilesParams extends UseProfilesParams {
  query: ProfilesListQuery;
  enabled?: boolean;
}

export interface UseFindAllProfilesParams extends UseProfilesParams {
  targetType?: ProfilesListQuery['targetType'];
  enabled?: boolean;
}
