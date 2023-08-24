/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import dateMath from '@kbn/datemath';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { addExcludeFrozenToQuery } from '@kbn/ml-query-utils';
import { getTimeFieldRange } from './time_field_range';
import type { GetTimeFieldRangeResponse } from './types';

/**
 * Allowed API paths to be passed to `setFullTimeRange`.
 */
export type SetFullTimeRangeApiPath =
  | '/internal/file_upload/time_field_range'
  | '/internal/ml/fields_service/time_field_range';

/**
 * Determines the full available time range of the given Data View and updates
 * the timefilter accordingly.
 *
 * @param timefilter - TimefilterContract
 * @param dataView - DataView
 * @param toasts - ToastsStart
 * @param http - HttpStart
 * @param query - optional query
 * @param excludeFrozenData - optional boolean flag
 * @param path - optional SetFullTimeRangeApiPath
 * @returns {GetTimeFieldRangeResponse}
 */
export async function setFullTimeRange(
  timefilter: TimefilterContract,
  dataView: DataView,
  toasts: ToastsStart,
  http: HttpStart,
  query?: QueryDslQueryContainer,
  excludeFrozenData?: boolean,
  path: SetFullTimeRangeApiPath = '/internal/file_upload/time_field_range'
): Promise<GetTimeFieldRangeResponse | undefined> {
  try {
    const runtimeMappings = dataView.getRuntimeMappings();
    const resp = await getTimeFieldRange({
      index: dataView.getIndexPattern(),
      timeFieldName: dataView.timeFieldName,
      query: excludeFrozenData ? addExcludeFrozenToQuery(query) : query,
      ...(isPopulatedObject(runtimeMappings) ? { runtimeMappings } : {}),
      http,
      path,
    });

    if (resp.start.epoch && resp.end.epoch) {
      timefilter.setTime({
        from: moment(resp.start.epoch).toISOString(),
        to: moment(resp.end.epoch).toISOString(),
      });
      return resp;
    } else if (typeof resp.start === 'number' && typeof resp.end === 'number') {
      timefilter.setTime({
        from: moment(resp.start).toISOString(),
        to: moment(resp.end).toISOString(),
      });
      return {
        success: true,
        start: { epoch: resp.start, string: moment(resp.start).toISOString() },
        end: { epoch: resp.end, string: moment(resp.end).toISOString() },
      };
    } else {
      toasts.addWarning({
        title: i18n.translate('xpack.ml.datePicker.fullTimeRangeSelector.noResults', {
          defaultMessage: 'No results match your search criteria',
        }),
      });
    }
  } catch (error) {
    toasts.addDanger(
      i18n.translate(
        'xpack.ml.datePicker.fullTimeRangeSelector.errorSettingTimeRangeNotification',
        {
          defaultMessage: 'An error occurred setting the time range.',
        }
      )
    );
  }
}

/**
 * Return type for the `getTimeFilterRange` function.
 */
export interface TimeRange {
  /**
   * From timestamp.
   */
  from: number;
  /**
   * To timestamp.
   */
  to: number;
}

/**
 * Function to get the time filter range as timestamps.
 *
 * @param timefilter - The timefilter
 * @returns TimeRange
 */
export function getTimeFilterRange(timefilter: TimefilterContract): TimeRange {
  const fromMoment = dateMath.parse(timefilter.getTime().from);
  const toMoment = dateMath.parse(timefilter.getTime().to);
  const from = fromMoment !== undefined ? fromMoment.valueOf() : 0;
  const to = toMoment !== undefined ? toMoment.valueOf() : 0;

  return {
    to,
    from,
  };
}
