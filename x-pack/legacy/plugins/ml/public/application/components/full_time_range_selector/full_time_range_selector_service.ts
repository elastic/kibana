/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { timefilter } from 'ui/timefilter';
import { Query } from 'src/plugins/data/public';
import dateMath from '@elastic/datemath';
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
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.fullTimeRangeSelector.errorSettingTimeRangeNotification', {
        defaultMessage: 'An error occurred setting the time range.',
      })
    );
    return resp;
  }
}

export function getTimeFilterRange(): TimeRange {
  let from = 0;
  let to = 0;
  const fromString = timefilter.getTime().from;
  const toString = timefilter.getTime().to;
  if (typeof fromString === 'string' && typeof toString === 'string') {
    const fromMoment = dateMath.parse(fromString);
    const toMoment = dateMath.parse(toString);
    if (typeof fromMoment !== 'undefined' && typeof toMoment !== 'undefined') {
      const fromMs = fromMoment.valueOf();
      const toMs = toMoment.valueOf();
      from = fromMs;
      to = toMs;
    }
  }
  return {
    to,
    from,
  };
}
