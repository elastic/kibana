/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';
import type { TimeUnit } from './form';
import { getTimeUnitLabel } from '../../helpers/format_size_units';

export const ILM_PHASE_ORDER: PhaseName[] = ['hot', 'warm', 'cold', 'frozen', 'delete'];

export const READONLY_ALLOWED_PHASES: PhaseName[] = ['hot', 'warm', 'cold'];

export const PHASE_LABELS: Record<PhaseName, string> = {
  hot: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelHot', {
    defaultMessage: 'Hot',
  }),
  warm: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelWarm', {
    defaultMessage: 'Warm',
  }),
  cold: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelCold', {
    defaultMessage: 'Cold',
  }),
  frozen: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelFrozen', {
    defaultMessage: 'Frozen',
  }),
  delete: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelDelete', {
    defaultMessage: 'Delete',
  }),
};

export const TIME_UNIT_OPTIONS: ReadonlyArray<{ value: TimeUnit; text: string }> = [
  {
    value: 'd',
    text: getTimeUnitLabel('d'),
  },
  {
    value: 'h',
    text: getTimeUnitLabel('h'),
  },
  {
    value: 'm',
    text: getTimeUnitLabel('m'),
  },
  {
    value: 's',
    text: getTimeUnitLabel('s'),
  },
];

export const DEFAULT_NEW_PHASE_MIN_AGE: { value: string; unit: TimeUnit } = {
  value: '30',
  unit: 'd',
};

export const PHASE_MOUNT_PATHS: Record<PhaseName, ReadonlyArray<string>> = {
  hot: [
    '_meta.hot.enabled',
    '_meta.hot.sizeInBytes',
    '_meta.hot.rollover',
    '_meta.hot.readonlyEnabled',
    '_meta.hot.downsampleEnabled',
  ],
  warm: [
    '_meta.warm.enabled',
    '_meta.warm.sizeInBytes',
    '_meta.warm.readonlyEnabled',
    '_meta.warm.downsampleEnabled',
  ],
  cold: [
    '_meta.cold.enabled',
    '_meta.cold.sizeInBytes',
    '_meta.cold.readonlyEnabled',
    '_meta.cold.downsampleEnabled',
    '_meta.cold.searchableSnapshotEnabled',
  ],
  frozen: ['_meta.frozen.enabled'],
  delete: ['_meta.delete.enabled', '_meta.delete.deleteSearchableSnapshotEnabled'],
};
