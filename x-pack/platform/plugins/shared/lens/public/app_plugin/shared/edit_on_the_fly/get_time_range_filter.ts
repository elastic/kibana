/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { getTime } from '@kbn/data-plugin/common';

/**
 * Builds a DSL range filter on the time field. TBUCKET needs it to run, even with LIMIT 0.
 * Returns undefined when there is no time field to filter on.
 */
export const getTimeRangeFilter = ({
  timeRange,
  timeFieldName,
  uiSettings,
}: {
  timeRange: TimeRange;
  timeFieldName?: string;
  uiSettings: IUiSettingsClient;
}) => {
  if (!timeFieldName) {
    return undefined;
  }
  const timeFilter = getTime(undefined, timeRange, { fieldName: timeFieldName });
  if (!timeFilter) {
    return undefined;
  }
  return buildEsQuery(undefined, [], [timeFilter], getEsQueryConfig(uiSettings));
};
