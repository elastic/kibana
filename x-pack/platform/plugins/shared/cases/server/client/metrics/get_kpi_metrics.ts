/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  MAX_KPI_FILTER_CASE_IDS,
  getPredefinedKpiMetric,
} from '../../../common/constants';
import type {
  KpiMetricResult,
  KpiMetricsCaseFilters,
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
import { prepareCasesSearch } from '../cases/search';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { combineAuthorizedAndOwnerFilter } from '../utils';
import { runKpiMetrics, toKpiMetricError } from './kpi';

const isCustomMetric = (metric: KpiMetricConfiguration): metric is CustomKpiMetricConfiguration =>
  metric.kind === 'custom';

const hasActiveCaseFilters = (
  filters: KpiMetricsCaseFilters | undefined
): filters is KpiMetricsCaseFilters =>
  filters != null && Object.values(filters).some((value) => !isEmpty(value));

const searchFilteredCaseIds = async ({
  owner,
  filters,
  clientArgs,
  casesClient,
}: {
  owner: string;
  filters: KpiMetricsCaseFilters;
  clientArgs: CasesClientArgs;
  casesClient: CasesClient;
}): Promise<{ ids: string[]; total: number }> => {
  const { caseOptions, namespaces, extendedFieldFilters, fieldLabelFilters } =
    await prepareCasesSearch({ ...filters, owner }, clientArgs, casesClient);

  return clientArgs.services.caseService.searchCaseIds({
    caseOptions,
    namespaces,
    extendedFieldFilters,
    fieldLabelFilters,
    maxIds: MAX_KPI_FILTER_CASE_IDS,
  });
};

/**
 * Returns the values of the case list metrics of one owner. The metrics that read the case search are skipped.
 * With active case list filters, the custom metrics count only the documents of the matching cases.
 */
export const getKpiMetrics = async (
  params: KpiMetricsRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
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
    const { owner, from, to, filters } =
      decodeWithExcessOrThrowZod(KpiMetricsRequestSchema)(params);

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
    const customMetrics = savedMetrics.filter(isCustomMetric);

    const unknownPredefinedResults: KpiMetricResult[] = savedMetrics
      .filter(
        (metric) =>
          metric.kind === 'predefined' &&
          getPredefinedKpiMetric(metric.predefinedId)?.source !== 'caseSearch'
      )
      .map(({ id }) => ({ id, type: 'error', message: 'The predefined metric is not known.' }));

    const filteredCases =
      customMetrics.length > 0 && hasActiveCaseFilters(filters)
        ? await searchFilteredCaseIds({ owner, filters, clientArgs, casesClient })
        : undefined;

    if (filteredCases != null && filteredCases.total > MAX_KPI_FILTER_CASE_IDS) {
      const message = `More than ${MAX_KPI_FILTER_CASE_IDS} cases match the case list filters. Add more filters to see this metric.`;

      return {
        enabled: true,
        metrics: [
          ...customMetrics.map(({ id }) => toKpiMetricError(id, message)),
          ...unknownPredefinedResults,
        ],
      };
    }

    const customResults = await runKpiMetrics({
      metrics: customMetrics,
      context: { spaceId, owner, from, to, caseIds: filteredCases?.ids },
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
