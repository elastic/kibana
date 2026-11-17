/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_SAVED_OBJECT, getPredefinedKpiMetric } from '../../../common/constants';
import type {
  KpiMetricResult,
  KpiMetricsRequest,
  KpiMetricsResponse,
} from '../../../common/types/api';
import { KpiMetricsRequestSchema } from '../../../common/types/api';
import type {
  CustomKpiMetricConfiguration,
  KpiMetricConfiguration,
} from '../../../common/types/domain';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import { combineAuthorizedAndOwnerFilter } from '../utils';
import { runKpiMetrics } from './kpi';

const isCustomMetric = (metric: KpiMetricConfiguration): metric is CustomKpiMetricConfiguration =>
  metric.kind === 'custom';

/**
 * Returns the values of the case list metrics of one owner. The metrics that read the case search are skipped.
 */
export const getKpiMetrics = async (
  params: KpiMetricsRequest,
  clientArgs: CasesClientArgs
): Promise<KpiMetricsResponse> => {
  const {
    unsecuredSavedObjectsClient,
    services: { caseConfigureService },
    authorization,
    logger,
    spaceId,
    config,
    analyticsV2Reader,
  } = clientArgs;

  try {
    const { owner, from, to } = decodeWithExcessOrThrowZod(KpiMetricsRequestSchema)(params);

    await authorization.ensureAuthorized({
      operation: Operations.getCasesMetrics,
      entities: [{ owner, id: owner }],
    });

    if (!config.analyticsV2.enabled) {
      return { enabled: false, metrics: [] };
    }

    const configurations = await caseConfigureService.find({
      unsecuredSavedObjectsClient,
      options: {
        filter: combineAuthorizedAndOwnerFilter(owner, undefined, CASE_CONFIGURE_SAVED_OBJECT),
      },
    });

    const savedMetrics = configurations.saved_objects[0]?.attributes.metrics?.casesList ?? [];

    const unknownPredefinedResults: KpiMetricResult[] = savedMetrics
      .filter(
        (metric) =>
          metric.kind === 'predefined' &&
          getPredefinedKpiMetric(metric.predefinedId)?.source !== 'caseSearch'
      )
      .map(({ id }) => ({ id, type: 'error', message: 'The predefined metric is not known.' }));

    const customResults = await runKpiMetrics({
      metrics: savedMetrics.filter(isCustomMetric),
      context: { spaceId, owner, from, to },
      reader: analyticsV2Reader,
    });

    return { enabled: true, metrics: [...customResults, ...unknownPredefinedResults] };
  } catch (error) {
    throw createCaseError({
      message: `Failed to get KPI metrics: ${error}`,
      error,
      logger,
    });
  }
};
