/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { DataQualityCardContent } from '../stream_detail_overview/data_quality_card';
import { IngestRateChartContent } from '../stream_detail_overview/ingest_rate_chart';

export function IndexInspectOverview({
  indexName,
  isDataStream,
  canReadFailureStore = false,
  failureStoreEnabled = false,
}: {
  indexName: string;
  isDataStream: boolean;
  canReadFailureStore?: boolean;
  failureStoreEnabled?: boolean;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <IngestRateChartContent
          streamName={indexName}
          esqlSource={indexName}
          canReadFailureStore={canReadFailureStore && failureStoreEnabled}
          isQueryStream={false}
          isDraft={false}
        />
      </EuiFlexItem>
      {isDataStream && (
        <EuiFlexItem grow={false}>
          <DataQualityCardContent
            streamName={indexName}
            canReadFailureStore={canReadFailureStore}
            failureStoreEnabled={failureStoreEnabled}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
