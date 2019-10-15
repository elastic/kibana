/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AnomaliesQueryTabBodyProps } from './types';
import { AnomaliesNetworkTable } from '../../../components/ml/tables/anomalies_network_table';

export const AnomaliesQueryTabBody = ({
  to,
  isInitializing,
  from,
  type,
  narrowDateRange,
}: AnomaliesQueryTabBodyProps) => (
  <AnomaliesNetworkTable
    startDate={from}
    endDate={to}
    skip={isInitializing}
    type={type}
    narrowDateRange={narrowDateRange}
  />
);

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
