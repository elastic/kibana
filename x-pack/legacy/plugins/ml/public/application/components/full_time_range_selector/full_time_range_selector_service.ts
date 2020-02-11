/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';
import { Query } from 'src/plugins/data/public';
import dateMath from '@elastic/datemath';
import { getTimefilter, getToastNotifications } from '../../util/dependency_cache';
import { ml, GetTimeFieldRangeResponse } from '../../services/ml_api_service';
import { IndexPattern } from '../../../../../../../../src/plugins/data/public';

export interface TimeRange {
  from: number;
  to: number;
}

export async function setFullTimeRange(
  indexPattern: IndexPattern,
  query: Query
): Promise<GetTimeFieldRangeResponse> {
  try {
    const timefilter = getTimefilter();
    const resp = await ml.getTimeFieldRange({
      index: indexPattern.title,
      timeFieldName: indexPattern.timeFieldName,
      query,
    });
    timefilter.setTime({
      from: moment(resp.start.epoch).toISOString(),
      to: moment(resp.end.epoch).toISOString(),
    });
    return resp;
  } catch (resp) {
    const toastNotifications = getToastNotifications();
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.fullTimeRangeSelector.errorSettingTimeRangeNotification', {
        defaultMessage: 'An error occurred setting the time range.',
      })
    );
    return resp;
  }
}

export function getTimeFilterRange(): TimeRange {
  const timefilter = getTimefilter();
  const fromMoment = dateMath.parse(timefilter.getTime().from);
  const toMoment = dateMath.parse(timefilter.getTime().to);
  const from = fromMoment !== undefined ? fromMoment.valueOf() : 0;
  const to = toMoment !== undefined ? toMoment.valueOf() : 0;

  return {
    to,
    from,
  };
}
