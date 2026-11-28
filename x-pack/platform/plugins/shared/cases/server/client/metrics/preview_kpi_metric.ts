/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KPI_METRIC_PREVIEW_ID } from '../../../common/constants';
import type { KpiMetricPreviewRequest, KpiMetricPreviewResponse } from '../../../common/types/api';
import { KpiMetricPreviewRequestSchema } from '../../../common/types/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import { resolveKpiRange, runKpiMetrics } from './kpi';

/**
 * Returns the value of one unsaved custom metric. Only a user who can edit the case settings can preview.
 */
export const previewKpiMetric = async (
  params: KpiMetricPreviewRequest,
  clientArgs: CasesClientArgs
): Promise<KpiMetricPreviewResponse> => {
  const { authorization, logger, spaceId, config, analyticsV2Reader } = clientArgs;

  try {
    const { owner, from, to, metric } = decodeWithExcessOrThrowZod(KpiMetricPreviewRequestSchema)(
      params
    );

    await authorization.ensureAuthorized({
      operation: Operations.updateConfiguration,
      entities: [{ owner, id: owner }],
    });

    if (!config.analyticsV2.enabled) {
      return {
        id: KPI_METRIC_PREVIEW_ID,
        type: 'error',
        message: 'Case analytics is not enabled.',
      };
    }

    const [result] = await runKpiMetrics({
      metrics: [{ ...metric, id: KPI_METRIC_PREVIEW_ID }],
      context: { spaceId, owner, ...resolveKpiRange({ from, to }) },
      reader: analyticsV2Reader,
    });

    return result;
  } catch (error) {
    throw createCaseError({
      message: `Failed to preview the KPI metric: ${error}`,
      error,
      logger,
    });
  }
};
