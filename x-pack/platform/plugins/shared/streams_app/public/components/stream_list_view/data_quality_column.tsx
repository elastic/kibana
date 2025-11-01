/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import { EuiLink } from '@elastic/eui';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useDatasetQuality } from '../../hooks/use_dataset_quality';

export function DataQualityColumn({ streamName }: { streamName: string }) {
  const { quality, isQualityLoading: isLoading } = useDatasetQuality({
    streamName,
    canReadFailureStore: true,
  });

  const router = useStreamsAppRouter();

  return (
    <EuiLink
      href={router.link('/{key}/management/{tab}', {
        path: { key: streamName, tab: 'dataQuality' },
      })}
      data-test-subj={`streamsDataQualityLink-${streamName}`}
    >
      <DatasetQualityIndicator
        dataTestSubj={`dataQualityIndicator-${streamName}`}
        quality={quality}
        isLoading={isLoading}
      />
    </EuiLink>
  );
}
