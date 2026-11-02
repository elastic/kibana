/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import { EuiLink } from '@elastic/eui';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function DataQualityColumn({
  streamName,
  quality,
  isLoading,
}: {
  streamName: string;
  quality: QualityIndicators;
  isLoading: boolean;
}) {
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
        showTooltip={true}
      />
    </EuiLink>
  );
}
