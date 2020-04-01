/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { getNotificationResultsLink } from './utils';
import { NotificationExecutorOptions } from './types';
import { parseScheduleDates } from '../signals/utils';
import { buildSignalsSearchQuery } from './build_signals_query';

interface SignalsCountResults {
  signalsCount: string;
  resultsLink: string;
}

interface GetSignalsCount {
  from: Date | string;
  to: Date | string;
  ruleAlertId: string;
  ruleId: string;
  index: string;
  kibanaSiemAppUrl: string | undefined;
  callCluster: NotificationExecutorOptions['services']['callCluster'];
}

export const getSignalsCount = async ({
  from,
  to,
  ruleAlertId,
  ruleId,
  index,
  callCluster,
  kibanaSiemAppUrl = '',
}: GetSignalsCount): Promise<SignalsCountResults> => {
  const fromMoment = moment.isDate(from) ? moment(from) : parseScheduleDates(from);
  const toMoment = moment.isDate(to) ? moment(to) : parseScheduleDates(to);

  if (!fromMoment || !toMoment) {
    throw new Error(`There was an issue with parsing ${from} or ${to} into Moment object`);
  }

  const fromInMs = fromMoment.format('x');
  const toInMs = toMoment.format('x');

  const query = buildSignalsSearchQuery({
    index,
    ruleId,
    to: toInMs,
    from: fromInMs,
  });

  const result = await callCluster('count', query);
  const resultsLink = getNotificationResultsLink({
    kibanaSiemAppUrl: `${kibanaSiemAppUrl}`,
    id: ruleAlertId,
    from: fromInMs,
    to: toInMs,
  });

  return {
    signalsCount: result.count,
    resultsLink,
  };
};
