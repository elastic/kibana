/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  BUILTIN_DATA_STREAMS_PROFILE_NAMES,
  BUILTIN_INDICES_PROFILE_NAMES,
} from '../../common/presets';
import type { BoostProfileType, DataStreamsWindowId, IndicesPresetId } from '../../common/types';

export interface PresetOption<TId extends string> {
  id: TId;
  label: string;
  description: string;
  isDefault: boolean;
}

export const INDICES_PRESET_OPTIONS: ReadonlyArray<PresetOption<IndicesPresetId>> = [
  {
    id: 'on_demand',
    label: i18n.translate('xpack.boost.presets.onDemand.label', {
      defaultMessage: 'On-demand',
    }),
    description: i18n.translate('xpack.boost.presets.onDemand.description', {
      defaultMessage:
        'Lowest cost. Query latency is more variable and maximum throughput is limited, especially during spikes.',
    }),
    isDefault: false,
  },
  {
    id: 'performant',
    label: i18n.translate('xpack.boost.presets.performant.label', {
      defaultMessage: 'Performant',
    }),
    description: i18n.translate('xpack.boost.presets.performant.description', {
      defaultMessage:
        'Consistently low average latency, scaling to high query throughput as load grows.',
    }),
    isDefault: true,
  },
  {
    id: 'high_availability',
    label: i18n.translate('xpack.boost.presets.highAvailability.label', {
      defaultMessage: 'High availability',
    }),
    description: i18n.translate('xpack.boost.presets.highAvailability.description', {
      defaultMessage:
        'Consistent low query latency from steady baseline to peak demand, with an extra copy of your data kept ready.',
    }),
    isDefault: false,
  },
];

// "search-ready" uses a non-breaking hyphen (\u2011), so a line never ends at its hyphen.
export const DATA_STREAMS_WINDOW_OPTIONS: ReadonlyArray<PresetOption<DataStreamsWindowId>> = [
  {
    id: 'last_1_day',
    label: i18n.translate('xpack.boost.presets.last1Day.label', {
      defaultMessage: 'Last 1 day',
    }),
    description: i18n.translate('xpack.boost.presets.last1Day.description', {
      defaultMessage: 'Only the most recent day of each data stream is kept search\u2011ready.',
    }),
    isDefault: false,
  },
  {
    id: 'last_3_days',
    label: i18n.translate('xpack.boost.presets.last3Days.label', {
      defaultMessage: 'Last 3 days',
    }),
    description: i18n.translate('xpack.boost.presets.last3Days.description', {
      defaultMessage: 'The most recent 3 days of each data stream are kept search\u2011ready.',
    }),
    isDefault: false,
  },
  {
    id: 'last_7_days',
    label: i18n.translate('xpack.boost.presets.last7Days.label', {
      defaultMessage: 'Last 7 days',
    }),
    description: i18n.translate('xpack.boost.presets.last7Days.description', {
      defaultMessage: 'The most recent week of each data stream is kept search\u2011ready.',
    }),
    isDefault: true,
  },
];

/** A project default's Elastic-managed choices, each with the profile it uses. */
export interface DefaultPresetOption {
  profileName: string;
  label: string;
  description: string;
  isDefault: boolean;
}

export const DEFAULT_PRESET_OPTIONS: Readonly<
  Record<BoostProfileType, readonly DefaultPresetOption[]>
> = {
  indices: INDICES_PRESET_OPTIONS.map(({ id, ...option }) => ({
    ...option,
    profileName: BUILTIN_INDICES_PROFILE_NAMES[id],
  })),
  data_streams: DATA_STREAMS_WINDOW_OPTIONS.map(({ id, ...option }) => ({
    ...option,
    profileName: BUILTIN_DATA_STREAMS_PROFILE_NAMES[id],
  })),
};
