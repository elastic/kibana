/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as i18n from './translations';
import { MatrixHistogramOption } from '../../../components/matrix_histogram/types';
import { HistogramType } from '../../../graphql/types';

export const anomaliesStackByOptions: MatrixHistogramOption[] = [
  {
    text: i18n.ANOMALIES_STACK_BY_JOB_ID,
    value: 'job_id',
  },
];

export const histogramConfigs = {
  defaultStackByOption: anomaliesStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_ANOMALIES_DATA,
  hideHistogramIfEmpty: true,
  histogramType: HistogramType.anomalies,
  stackByOptions: anomaliesStackByOptions,
  subtitle: undefined,
  title: i18n.ANOMALIES_TITLE,
};
