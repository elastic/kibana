/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink, EuiSkeletonRectangle } from '@elastic/eui';
import React from 'react';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { DataStreamSelector, TimeRangeConfig } from '../../../../common/types';
import { useDatasetRedirectLinkTelemetry, useRedirectLink } from '../../../hooks';
import { QualityPercentageIndicator } from '../../quality_indicator';

export const QualityStatPercentageLink = ({
  isLoading,
  dataStreamStat,
  timeRange,
  dataTestSubj,
  query = { language: 'kuery', query: '' },
  accessor,
  selector,
  fewDocStatsTooltip,
}: {
  isLoading: boolean;
  dataStreamStat: DataStreamStat;
  timeRange: TimeRangeConfig;
  dataTestSubj: string;
  query?: { language: string; query: string };
  accessor: 'degradedDocs' | 'failedDocs';
  selector?: DataStreamSelector;
  fewDocStatsTooltip: (docsCount: number) => string;
}) => {
  const {
    [accessor]: { percentage, count },
  } = dataStreamStat;

  const { sendTelemetry } = useDatasetRedirectLinkTelemetry({
    rawName: `${dataStreamStat.rawName}${selector ?? ''}`,
    query,
  });

  const redirectLinkProps = useRedirectLink({
    dataStreamStat,
    query,
    sendTelemetry,
    timeRangeConfig: timeRange,
    selector,
  });

  return (
    <EuiSkeletonRectangle width="50px" height="20px" borderRadius="m" isLoading={isLoading}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {percentage ? (
          <EuiLink data-test-subj={dataTestSubj} {...redirectLinkProps.linkProps}>
            <QualityPercentageIndicator
              percentage={percentage}
              docsCount={count}
              fewDocsTooltipContent={fewDocStatsTooltip}
            />
          </EuiLink>
        ) : (
          <QualityPercentageIndicator
            percentage={percentage}
            fewDocsTooltipContent={fewDocStatsTooltip}
          />
        )}
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
};
