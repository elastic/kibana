/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';

export const TOTAL_FIELDS_LIMIT_SETTING = 'index.mapping.total_fields.limit';
export const TOTAL_FIELDS_IGNORE_DYNAMIC_BEYOND_LIMIT_SETTING =
  'index.mapping.total_fields.ignore_dynamic_beyond_limit';

// Settings may come back from ES in nested form (index.mapping.total_fields.limit as
// nested objects), in flat form (when requested with flat_settings), or without the
// `index.` prefix (as allowed in template bodies), so check all shapes.
const readSetting = (settings: IndicesIndexSettings | undefined, setting: string): unknown => {
  if (!settings) {
    return undefined;
  }
  return (
    get(settings, `index.${setting}`.split('.')) ??
    get(settings, setting.split('.')) ??
    get(settings, [`index.${setting}`]) ??
    get(settings, [setting])
  );
};

export const getTotalFieldsLimitFromSettings = (
  settings: IndicesIndexSettings | undefined
): number | undefined => {
  const raw = readSetting(settings, 'mapping.total_fields.limit');
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const getIgnoreDynamicBeyondLimitFromSettings = (
  settings: IndicesIndexSettings | undefined
): boolean | undefined => {
  const raw = readSetting(settings, 'mapping.total_fields.ignore_dynamic_beyond_limit');
  if (raw === undefined || raw === null) {
    return undefined;
  }
  return raw === true || raw === 'true';
};

export const getTotalFieldsLimitSettings = (limit: number): IndicesIndexSettings => ({
  [TOTAL_FIELDS_LIMIT_SETTING]: limit,
  [TOTAL_FIELDS_IGNORE_DYNAMIC_BEYOND_LIMIT_SETTING]: true,
});

export interface TotalFieldsLimitEvaluation {
  // True when every settings object already has a limit >= the requested value and the
  // ignore_dynamic_beyond_limit flag set, i.e. a settings update would be a no-op.
  isSatisfied: boolean;
  // Never lower a limit that is already higher than the requested value; a higher limit
  // may have been set manually or by a previous, higher configuration and lowering it
  // can immediately put the mapping over the limit.
  effectiveLimit: number;
}

export const evaluateTotalFieldsLimit = (
  allSettings: Array<IndicesIndexSettings | undefined>,
  requestedLimit: number
): TotalFieldsLimitEvaluation => {
  const currentLimits = allSettings
    .map(getTotalFieldsLimitFromSettings)
    .filter((limit): limit is number => limit !== undefined);

  const isSatisfied =
    allSettings.length > 0 &&
    currentLimits.length === allSettings.length &&
    Math.min(...currentLimits) >= requestedLimit &&
    allSettings.every((settings) => getIgnoreDynamicBeyondLimitFromSettings(settings) === true);

  return {
    isSatisfied,
    effectiveLimit: Math.max(requestedLimit, ...currentLimits),
  };
};
