/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import url from 'url';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { QueryString } from 'ui/utils/query_string';
import { encode } from 'rison-node';
import { TimeRange } from '../../../../../common/http_api/shared/time_range';

export const AnalyzeInMlButton: React.FunctionComponent<{
  jobId: string;
  partition?: string;
  timeRange: TimeRange;
}> = ({ jobId, partition, timeRange }) => {
  const pathname = chrome.addBasePath('/app/ml');
  const buttonLabel = (
    <FormattedMessage
      id="xpack.infra.logs.analysis.analyzeInMlButtonLabel"
      defaultMessage="Analyze in ML"
    />
  );
  return partition ? (
    <EuiButton
      fill={false}
      href={getPartitionSpecificSingleMetricViewerLink(pathname, jobId, partition, timeRange)}
    >
      {buttonLabel}
    </EuiButton>
  ) : (
    <EuiButton fill={true} href={getOverallAnomalyExplorerLink(pathname, jobId, timeRange)}>
      {buttonLabel}
    </EuiButton>
  );
};

const getOverallAnomalyExplorerLink = (pathname: string, jobId: string, timeRange: TimeRange) => {
  const { from, to } = convertTimeRangeToParams(timeRange);

  const _g = encode({
    ml: {
      jobIds: [jobId],
    },
    time: {
      from,
      to,
    },
  });

  const hash = `/explorer?${QueryString.encode({ _g })}`;

  return url.format({
    pathname,
    hash,
  });
};

const getPartitionSpecificSingleMetricViewerLink = (
  pathname: string,
  jobId: string,
  partition: string,
  timeRange: TimeRange
) => {
  const { from, to } = convertTimeRangeToParams(timeRange);

  const _g = encode({
    ml: {
      jobIds: [jobId],
    },
    time: {
      from,
      to,
      mode: 'absolute',
    },
  });

  const _a = encode({
    mlTimeSeriesExplorer: {
      entities: { 'event.dataset': partition === 'unknown' ? '' : partition },
    },
  });

  const hash = `/timeseriesexplorer?${QueryString.encode({ _g, _a })}`;

  return url.format({
    pathname,
    hash,
  });
};

const convertTimeRangeToParams = (timeRange: TimeRange): { from: string; to: string } => {
  return {
    from: new Date(timeRange.startTime).toISOString(),
    to: new Date(timeRange.endTime).toISOString(),
  };
};
