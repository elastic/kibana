/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { DURATION_REGEX } from '../../constants';

export const validateDuration = (duration: string) => {
  const durationRegexp = new RegExp(DURATION_REGEX, 'g');

  if (!durationRegexp.test(duration)) {
    return `Invalid schedule duration format: ${duration}`;
  }

  const date = dateMath.parse(`now-${duration}`);

  if (!date || !date.isValid()) {
    return 'Invalid schedule duration.';
  }
  return;
};
