/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { MAX_BOOST } from '../../common/constants';
import {
  BUILTIN_DATA_STREAMS_PROFILE_NAMES,
  BUILTIN_INDICES_PROFILE_NAMES,
} from '../../common/presets';
import type { BoostProfileInput, BoostRuleInput } from '../../common/types';
import { createProfile, createRule } from '../lib/boost_store';
import { BoostRequestError } from '../lib/errors';

// Sample custom profiles and rules for demos. They target the sample indices and data streams, and
// show a rule overriding a broader one through priority.

export const SAMPLE_PROFILES: readonly BoostProfileInput[] = [
  {
    type: 'indices',
    name: 'storefront-search',
    min_boost: 2,
    max_boost: MAX_BOOST,
    high_availability: 'one_extra_copy',
    prewarm: true,
    pinned: false,
  },
  {
    type: 'data_streams',
    name: 'clickstream-recent',
    recent: { min_boost: 2, max_boost: MAX_BOOST, max_age: '12h' },
    standard: { min_boost: 1, max_boost: 100, max_age: '3d' },
    background: { min_boost: 0, max_boost: 1 },
  },
];

export const SAMPLE_RULES: readonly BoostRuleInput[] = [
  {
    name: 'storefront-catalogs',
    index_pattern: 'catalog-*',
    boost_profile: 'storefront-search',
    priority: 10,
  },
  {
    name: 'archives-on-demand',
    index_pattern: 'archive-*',
    boost_profile: BUILTIN_INDICES_PROFILE_NAMES.on_demand,
    priority: 0,
  },
  {
    name: 'clickstream',
    index_pattern: 'clicks-*',
    boost_profile: 'clickstream-recent',
    priority: 10,
  },
  {
    name: 'mobile-clicks-weekly',
    index_pattern: 'clicks-mobile',
    boost_profile: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days,
    priority: 20,
  },
];

const ignoreConflict = async (create: () => Promise<void>) => {
  try {
    await create();
  } catch (error) {
    if (!(error instanceof BoostRequestError && error.statusCode === 409)) {
      throw error;
    }
  }
};

/** Creates any missing sample profiles and rules, leaving existing ones untouched. */
export const ensureSampleConfig = async (client: SavedObjectsClientContract): Promise<void> => {
  // Profiles first, since rules must reference existing profiles.
  for (const profile of SAMPLE_PROFILES) {
    await ignoreConflict(() => createProfile(client, profile));
  }
  for (const rule of SAMPLE_RULES) {
    await ignoreConflict(() => createRule(client, rule));
  }
};
