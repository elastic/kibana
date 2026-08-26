/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PhaseName } from '@kbn/streams-schema';
import type { FieldPath } from 'react-hook-form';
import type { IlmPhasesFlyoutFormInternal, TimeUnit } from './form';
export { TIME_UNIT_OPTIONS } from '../shared';

export const DEFAULT_NEW_PHASE_MIN_AGE: { value: string; unit: TimeUnit } = {
  value: '30',
  unit: 'd',
};

export const PHASE_MOUNT_PATHS = {
  hot: [
    '_meta.hot.enabled',
    '_meta.hot.sizeInBytes',
    '_meta.hot.rollover',
    '_meta.hot.downsampleEnabled',
  ],
  warm: ['_meta.warm.enabled', '_meta.warm.sizeInBytes', '_meta.warm.downsampleEnabled'],
  cold: [
    '_meta.cold.enabled',
    '_meta.cold.sizeInBytes',
    '_meta.cold.downsampleEnabled',
    '_meta.cold.searchableSnapshotEnabled',
  ],
  frozen: ['_meta.frozen.enabled'],
  delete: ['_meta.delete.enabled', '_meta.delete.deleteSearchableSnapshotEnabled'],
} satisfies Record<PhaseName, ReadonlyArray<FieldPath<IlmPhasesFlyoutFormInternal>>>;
