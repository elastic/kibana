/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/data-plugin/common';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';

export const convertToAbsoluteTimeRange = (timeRange?: TimeRange): TimeRange | undefined => {
  if (!timeRange) {
    return;
  }

  const absRange = getAbsoluteTimeRange(
    {
      from: timeRange.from,
      to: timeRange.to,
    },
    { forceNow: new Date() }
  );

  return {
    from: absRange.from,
    to: absRange.to,
  };
};
