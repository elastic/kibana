/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { encode } from 'rison-node';
import { QueryString } from 'ui/utils/query_string';
import url from 'url';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimeRange } from '../../../../common/http_api/shared/time_range';

export const AnalyzeInMlButton: React.FunctionComponent<{
  jobId: string;
  partition?: string;
  timeRange: TimeRange;
}> = ({ jobId, partition, timeRange }) => {
  const prependBasePath = useKibana().services.http?.basePath?.prepend;
  if (!prependBasePath) {
    return null;
  }
  const pathname = prependBasePath('/app/ml');
  const buttonLabel = (
    <FormattedMessage
      id="xpack.infra.logs.analysis.analyzeInMlButtonLabel"
      defaultMessage="Analyze in ML"
    />
  );
  return typeof partition === 'string' ? (
    <EuiButton
      fill={false}
      size="s"
      href={getPartitionSpecificSingleMetricViewerLink(pathname, jobId, partition, timeRange)}
    >
      {buttonLabel}
    </EuiButton>
  ) : (
    <EuiButton
      fill={true}
      size="s"
      href={getOverallAnomalyExplorerLink(pathname, jobId, timeRange)}
    >
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
      entities: { 'event.dataset': partition },
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
