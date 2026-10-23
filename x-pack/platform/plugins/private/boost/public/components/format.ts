/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../common/types';
import { parseMaxAge } from '../../common/validation';

const numberFormat = new Intl.NumberFormat(i18n.getLocale(), { maximumFractionDigits: 2 });

export const formatBoost = (boost: number): string => numberFormat.format(boost);

/** A min–max boost, such as "2–5,000". */
export const formatBoostRange = (minBoost: number, maxBoost: number): string =>
  i18n.translate('xpack.boost.format.boostRange', {
    defaultMessage: '{min}–{max}',
    values: { min: formatBoost(minBoost), max: formatBoost(maxBoost) },
  });

/** A phase's min–max boost, such as "2–5,000 boost". */
export const formatPhaseBoost = (minBoost: number, maxBoost: number): string =>
  i18n.translate('xpack.boost.format.phaseBoost', {
    defaultMessage: '{range} boost',
    values: { range: formatBoostRange(minBoost, maxBoost) },
  });

export const PROFILE_TYPE_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.format.indicesType', { defaultMessage: 'Indices' }),
  data_streams: i18n.translate('xpack.boost.format.dataStreamsType', {
    defaultMessage: 'Data streams',
  }),
};

/** Formats a count of data sources of a profile type, such as "3 indices" or "1 data stream". */
export const formatDataSourceCount = (type: BoostProfileType | undefined, count: number): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.boost.format.dataStreamCount', {
        defaultMessage: '{count, plural, one {# data stream} other {# data streams}}',
        values: { count },
      })
    : i18n.translate('xpack.boost.format.indexCount', {
        defaultMessage: '{count, plural, one {# index} other {# indices}}',
        values: { count },
      });

/** Counts indices and data streams together, leaving out a type there are none of. */
export const formatDataSourceCounts = (indexCount: number, dataStreamCount: number): string => {
  const indices = formatDataSourceCount('indices', indexCount);
  const dataStreams = formatDataSourceCount('data_streams', dataStreamCount);
  if (indexCount > 0 && dataStreamCount > 0) {
    return i18n.translate('xpack.boost.format.indexAndDataStreamCounts', {
      defaultMessage: '{indices} and {dataStreams}',
      values: { indices, dataStreams },
    });
  }
  return dataStreamCount > 0 ? dataStreams : indices;
};

/** A period's max age in words, such as "7 days" or "12 hours", or undefined if it has none. */
export const formatMaxAge = (maxAge: string | undefined): string | undefined => {
  const parsed = parseMaxAge(maxAge);
  if (!parsed) {
    return undefined;
  }
  const { value, unit } = parsed;
  return unit === 'h'
    ? i18n.translate('xpack.boost.format.maxAgeHours', {
        defaultMessage: '{value, plural, one {# hour} other {# hours}}',
        values: { value },
      })
    : i18n.translate('xpack.boost.format.maxAgeDays', {
        defaultMessage: '{value, plural, one {# day} other {# days}}',
        values: { value },
      });
};
