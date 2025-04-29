/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Order of node roles matters here, the warm phase prefers allocating data
// to the data_warm role.
import { DataTierRole, PhaseWithAllocation } from '../types';

const WARM_PHASE_NODE_PREFERENCE: DataTierRole[] = ['data_warm', 'data_hot'];

const COLD_PHASE_NODE_PREFERENCE: DataTierRole[] = ['data_cold', 'data_warm', 'data_hot'];

const FROZEN_PHASE_NODE_PREFERENCE: DataTierRole[] = [
  'data_frozen',
  'data_cold',
  'data_warm',
  'data_hot',
];

export const phaseToNodePreferenceMap: Record<PhaseWithAllocation, DataTierRole[]> = Object.freeze({
  warm: WARM_PHASE_NODE_PREFERENCE,
  cold: COLD_PHASE_NODE_PREFERENCE,
  frozen: FROZEN_PHASE_NODE_PREFERENCE,
});
