/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChartSeriesData } from '../../../charts/common';
import { KpiHostsChartColors } from '../kpi_hosts/types';

enum AuthMatrixDataGroup {
  authSuccess = 'authentication_success',
  authFailure = 'authentication_failure',
}

export interface AuthMatrixDataFields {
  [AuthMatrixDataGroup.authSuccess]: ChartSeriesData;
  [AuthMatrixDataGroup.authFailure]: ChartSeriesData;
}

export const authMatrixDataMappingFields: AuthMatrixDataFields = {
  [AuthMatrixDataGroup.authSuccess]: {
    key: AuthMatrixDataGroup.authSuccess,
    value: null,
    color: KpiHostsChartColors.authSuccess,
  },
  [AuthMatrixDataGroup.authFailure]: {
    key: AuthMatrixDataGroup.authFailure,
    value: null,
    color: KpiHostsChartColors.authFailure,
  },
};
