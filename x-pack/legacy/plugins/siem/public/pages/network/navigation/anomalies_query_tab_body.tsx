/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AnomaliesQueryTabBodyProps } from '../ip_details/types';
import { AnomaliesNetworkTable } from '../../../components/ml/tables/anomalies_network_table';

export const AnomaliesQueryTabBody = ({
  endDate,
  flowTarget,
  ip,
  skip,
  startDate,
  type,
  narrowDateRange,
}: AnomaliesQueryTabBodyProps) => (
  <AnomaliesNetworkTable
    startDate={startDate}
    endDate={endDate}
    skip={skip}
    type={type}
    ip={ip}
    flowTarget={flowTarget}
    narrowDateRange={narrowDateRange}
  />
);

AnomaliesQueryTabBody.displayName = 'AnomaliesQueryTabBody';
