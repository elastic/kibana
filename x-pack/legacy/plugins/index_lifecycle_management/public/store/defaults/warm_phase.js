/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PHASE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_NODE_ATTRS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
  PHASE_ROLLOVER_ALIAS,
  PHASE_SHRINK_ENABLED,
  WARM_PHASE_ON_ROLLOVER,
  PHASE_INDEX_PRIORITY,
} from '../../constants';

export const defaultWarmPhase = {
  [PHASE_ENABLED]: false,
  [PHASE_ROLLOVER_ALIAS]: '',
  [PHASE_FORCE_MERGE_SEGMENTS]: '',
  [PHASE_FORCE_MERGE_ENABLED]: false,
  [PHASE_ROLLOVER_MINIMUM_AGE]: 0,
  [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: 'd',
  [PHASE_NODE_ATTRS]: '',
  [PHASE_SHRINK_ENABLED]: false,
  [PHASE_PRIMARY_SHARD_COUNT]: '',
  [PHASE_REPLICA_COUNT]: '',
  [WARM_PHASE_ON_ROLLOVER]: true,
  [PHASE_INDEX_PRIORITY]: 50,
};
export const defaultEmptyWarmPhase = {
  ...defaultWarmPhase,
  [WARM_PHASE_ON_ROLLOVER]: false,
  [PHASE_INDEX_PRIORITY]: '',
};
