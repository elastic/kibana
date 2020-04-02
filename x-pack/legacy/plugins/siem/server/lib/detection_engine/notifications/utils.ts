/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { parseScheduleDates } from '../signals/utils';

export const getNotificationResultsLink = ({
  kibanaSiemAppUrl,
  id,
  from,
  to,
}: {
  kibanaSiemAppUrl: string;
  id: string;
  from: string;
  to: string;
}) =>
  `${kibanaSiemAppUrl}#/detections/rules/id/${id}?timerange=(global:(linkTo:!(timeline),timerange:(from:${from},kind:absolute,to:${to})),timeline:(linkTo:!(global),timerange:(from:${from},kind:absolute,to:${to})))`;

export const parseDateRanges = (from: Date | string, to: Date | string) => {
  const fromMoment = moment.isDate(from) ? moment(from) : parseScheduleDates(from);
  const toMoment = moment.isDate(to) ? moment(to) : parseScheduleDates(to);

  if (!fromMoment || !toMoment) {
    throw new Error(`There was an issue with parsing ${from} or ${to} into Moment object`);
  }

  const fromInMs = fromMoment.format('x');
  const toInMs = toMoment.format('x');

  return {
    fromInMs,
    toInMs,
  };
};
