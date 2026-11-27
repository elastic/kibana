/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  BoostProfile,
  BoostRule,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../common/types';

// Elasticsearch returns `prewarm` and `pinned` as "true" or "false".
type IndicesBoostProfileResponse = Omit<IndicesBoostProfile, 'prewarm' | 'pinned'> & {
  prewarm: boolean | string;
  pinned: boolean | string;
};

type BoostProfileResponse = IndicesBoostProfileResponse | DataStreamsBoostProfile;

const toBoolean = (value: boolean | string) => value === true || value === 'true';

const toProfile = (profile: BoostProfileResponse): BoostProfile =>
  profile.type === 'indices'
    ? { ...profile, prewarm: toBoolean(profile.prewarm), pinned: toBoolean(profile.pinned) }
    : profile;

// The `_boost` list responses key each profile or rule by its name.
export const getBoostProfiles = async (client: ElasticsearchClient): Promise<BoostProfile[]> => {
  const profiles = await client.transport.request<Record<string, BoostProfileResponse>>({
    method: 'GET',
    path: '/_boost/profile',
  });
  return Object.values(profiles).map(toProfile);
};

export const getBoostRules = async (client: ElasticsearchClient): Promise<BoostRule[]> => {
  const rules = await client.transport.request<Record<string, BoostRule>>({
    method: 'GET',
    path: '/_boost/rule',
  });
  return Object.values(rules);
};
