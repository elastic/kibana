/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceChange } from '../../common/step_types/gather_maintenance';

/** The removals `percent` of `count` items allows, and at least `min`. */
export const removalLimitOf = (count: number, percent: number, min: number): number =>
  Math.max(min, Math.floor((count * percent) / 100));

/** The items the model's changes remove: those absorbed by a merge, and the losers of conflicts. */
export const modelRemovalsOf = (changes: readonly MaintenanceChange[]): number =>
  changes.filter(({ change }) => change === 'superseded').length;
