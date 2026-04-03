/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Owner } from '../../../common/constants/types';
import { getActivityDestinationIndexAlias } from '../activity_index/constants';

const CAI_LIFECYCLE_INDEX_NAME_BASE = '.internal.cases-analytics-lifecycle';
export function getLifecycleDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_LIFECYCLE_INDEX_NAME_BASE}.${owner}-${spaceId}`.toLowerCase();
}

const CAI_LIFECYCLE_INDEX_ALIAS_BASE = '.cases-analytics-lifecycle';
export function getLifecycleDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_LIFECYCLE_INDEX_ALIAS_BASE}.${owner}-${spaceId}`.toLowerCase();
}

export const CAI_LIFECYCLE_INDEX_VERSION = 1;

const CAI_LIFECYCLE_TRANSFORM_ID_BASE = 'cai_lifecycle_transform';
export function getLifecycleTransformId(spaceId: string, owner: Owner) {
  return `${CAI_LIFECYCLE_TRANSFORM_ID_BASE}-${owner}-${spaceId}`.toLowerCase();
}

/**
 * Returns the source index pattern for the lifecycle transform.
 * This is the activity index alias which holds all user-action events.
 */
export function getLifecycleSourceIndex(spaceId: string, owner: Owner) {
  return getActivityDestinationIndexAlias(spaceId, owner);
}
