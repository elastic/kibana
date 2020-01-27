/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PHASE_ENABLED,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_NODE_ATTRS,
  PHASE_REPLICA_COUNT,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
  PHASE_ROLLOVER_ALIAS,
  PHASE_FREEZE_ENABLED,
  PHASE_INDEX_PRIORITY,
} from '../../constants';

export const defaultColdPhase = {
  [PHASE_ENABLED]: false,
  [PHASE_ROLLOVER_ALIAS]: '',
  [PHASE_ROLLOVER_MINIMUM_AGE]: '',
  [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: 'd',
  [PHASE_NODE_ATTRS]: '',
  [PHASE_REPLICA_COUNT]: '',
  [PHASE_FREEZE_ENABLED]: false,
  [PHASE_INDEX_PRIORITY]: 0,
};
export const defaultEmptyColdPhase = {
  ...defaultColdPhase,
  [PHASE_INDEX_PRIORITY]: '',
};
