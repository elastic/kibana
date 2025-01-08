/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { EuiSpacer, OnRefreshProps } from '@elastic/eui';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { AggregationNotSupported } from './aggregation_not_supported';
import { DegradedFields } from './degraded_fields';

const OverviewHeader = dynamic(() => import('./header'));
const Summary = dynamic(() => import('./summary'));
const DegradedDocs = dynamic(() => import('./document_trends/degraded_docs'));

export function Overview() {
  const { dataStream, isNonAggregatable, updateTimeRange } = useDatasetQualityDetailsState();
  const [lastReloadTime, setLastReloadTime] = useState<number>(Date.now());

  const handleRefresh = useCallback(
    (refreshProps: OnRefreshProps) => {
      updateTimeRange(refreshProps);
      setLastReloadTime(Date.now());
    },
    [updateTimeRange]
  );
  return (
    <>
      {isNonAggregatable && <AggregationNotSupported dataStream={dataStream} />}
      <OverviewHeader handleRefresh={handleRefresh} />
      <EuiSpacer size="m" />
      <Summary />
      <EuiSpacer size="m" />
      <DegradedDocs lastReloadTime={lastReloadTime} />
      <EuiSpacer size="m" />
      <DegradedFields />
    </>
  );
}
