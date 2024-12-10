/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { parseDuration } from '../../common';

export const getNextRun = ({
  startDate,
  interval,
}: {
  startDate?: Date | null;
  interval: string;
}) => {
  return moment(startDate || new Date())
    .add(parseDuration(interval), 'ms')
    .toISOString();
};
