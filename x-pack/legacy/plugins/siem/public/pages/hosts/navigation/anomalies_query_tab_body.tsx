/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AnomaliesQueryTabBodyProps } from './types';
import { AnomaliesHostTable } from '../../../components/ml/tables/anomalies_host_table';

export const AnomaliesQueryTabBody = ({
  endDate,
  skip,
  startDate,
  type,
  narrowDateRange,
  hostName,
}: AnomaliesQueryTabBodyProps) => (
  <AnomaliesHostTable
    startDate={startDate}
    endDate={endDate}
    skip={skip}
    type={type}
    hostName={hostName}
    narrowDateRange={narrowDateRange}
  />
);

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
