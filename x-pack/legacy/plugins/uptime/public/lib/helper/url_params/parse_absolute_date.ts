/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';

export const parseAbsoluteDate = (date: string, defaultValue: number): number => {
  const momentWrapper = DateMath.parse(date);
  if (momentWrapper) {
    return momentWrapper.valueOf();
  }
  return defaultValue;
};
