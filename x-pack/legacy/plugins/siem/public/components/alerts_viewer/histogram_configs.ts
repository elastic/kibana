/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as i18n from './translations';
import { MatrixHistogramOption } from '../matrix_histogram/types';
import { HistogramType } from '../../graphql/types';

export const alertsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'event.category',
    value: 'event.category',
  },
  {
    text: 'event.module',
    value: 'event.module',
  },
];

export const histogramConfigs = {
  defaultStackByOption: alertsStackByOptions[1],
  errorMessage: i18n.ERROR_FETCHING_ALERTS_DATA,
  histogramType: HistogramType.alerts,
  stackByOptions: alertsStackByOptions,
  subtitle: undefined,
  title: i18n.ALERTS_GRAPH_TITLE,
};
