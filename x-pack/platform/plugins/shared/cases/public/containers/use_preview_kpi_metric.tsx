/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { KpiMetricPreviewRequest } from '../../common/types/api';
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import type { ServerError } from '../types';
import { previewKpiMetric } from './api';
import { casesMutationsKeys, DEFAULT_FROM_DATE, DEFAULT_TO_DATE } from './constants';
import * as i18n from './translations';

/**
 * Calculates the value of one unsaved custom metric for the default date range of the case list.
 */
export const usePreviewKpiMetric = () => {
  const { showErrorToast } = useCasesToast();
  const { owner } = useCasesContext();

  return useMutation(
    (metric: KpiMetricPreviewRequest['metric']) =>
      previewKpiMetric({ owner: owner[0], from: DEFAULT_FROM_DATE, to: DEFAULT_TO_DATE, metric }),
    {
      mutationKey: casesMutationsKeys.previewKpiMetric,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.KPI_METRIC_PREVIEW_ERROR_TITLE });
      },
    }
  );
};
