/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PHASE_ENABLED,
  PHASE_ROLLOVER_ENABLED,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_AGE_UNITS,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_DOCUMENTS,
  PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
  PHASE_INDEX_PRIORITY
} from '../../constants';

export const defaultHotPhase = {
  [PHASE_ENABLED]: true,
  [PHASE_ROLLOVER_ENABLED]: true,
  [PHASE_ROLLOVER_MAX_AGE]: 30,
  [PHASE_ROLLOVER_MAX_AGE_UNITS]: 'd',
  [PHASE_ROLLOVER_MAX_SIZE_STORED]: 50,
  [PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]: 'gb',
  [PHASE_INDEX_PRIORITY]: 100,
  [PHASE_ROLLOVER_MAX_DOCUMENTS]: ''
};
export const defaultEmptyHotPhase = {
  ...defaultHotPhase,
  [PHASE_ENABLED]: false,
  [PHASE_ROLLOVER_ENABLED]: false,
  [PHASE_ROLLOVER_MAX_AGE]: '',
  [PHASE_ROLLOVER_MAX_SIZE_STORED]: '',
  [PHASE_INDEX_PRIORITY]: '',
  [PHASE_ROLLOVER_MAX_DOCUMENTS]: ''
};
