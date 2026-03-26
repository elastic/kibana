/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { DURATION_REGEX } from '../../../routes/schemas/schedule/constants';

export const getDurationInMilliseconds = (duration: string): number => {
  const [, durationNumber, durationUnit] = duration.match(DURATION_REGEX) ?? [];

  return moment
    .duration(durationNumber, durationUnit as moment.unitOfTime.DurationConstructor)
    .asMilliseconds();
};
