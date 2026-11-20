/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KpiMetricsConfigurationRequest } from '../../../common/types/api';
import type { KpiMetricConfiguration, KpiMetricsConfiguration } from '../../../common/types/domain';

type KpiMetricRequestList = NonNullable<KpiMetricsConfigurationRequest['casesList']>;

const assignIds = (metrics?: KpiMetricRequestList): KpiMetricConfiguration[] | undefined =>
  metrics?.map((metric) => ({ ...metric, id: metric.id ?? uuidv4() }));

/**
 * Gives every metric without an id a server-generated id.
 */
export const assignKpiMetricIds = (
  metrics?: KpiMetricsConfigurationRequest
): KpiMetricsConfiguration | undefined => {
  if (metrics == null) {
    return;
  }

  const { casesList, caseDetails, casesListDisplay } = metrics;

  return {
    ...(casesList !== undefined && { casesList: assignIds(casesList) }),
    ...(caseDetails !== undefined && { caseDetails: assignIds(caseDetails) }),
    ...(casesListDisplay !== undefined && { casesListDisplay }),
  };
};
