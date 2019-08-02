/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiFlexGroup } from '@elastic/eui';
import { getEmptyTagValue } from '../../empty_value';
import { Anomalies, Anomaly, NarrowDateRange } from '../types';
import { getTopSeverityJobs } from './get_top_severity';
import { AnomalyScore } from './anomaly_score';

interface Args {
  startDate: number;
  endDate: number;
  anomalies: Anomalies | null;
  isLoading: boolean;
  narrowDateRange: NarrowDateRange;
  limit?: number;
}

export const createJobKey = (score: Anomaly): string =>
  `${score.jobId}-${score.severity}-${score.entityName}-${score.entityValue}`;

export const AnomalyScores = React.memo<Args>(
  ({ anomalies, startDate, endDate, isLoading, narrowDateRange, limit }): JSX.Element => {
    if (isLoading) {
      return <EuiLoadingSpinner data-test-subj="anomaly-score-spinner" size="m" />;
    } else if (anomalies == null || anomalies.anomalies.length === 0) {
      return getEmptyTagValue();
    } else {
      return (
        <>
          <EuiFlexGroup gutterSize="none" responsive={false}>
            {getTopSeverityJobs(anomalies.anomalies, limit).map((score, index) => {
              const jobKey = createJobKey(score);
              return (
                <AnomalyScore
                  key={jobKey}
                  jobKey={jobKey}
                  startDate={startDate}
                  endDate={endDate}
                  index={index}
                  score={score}
                  interval={anomalies.interval}
                  narrowDateRange={narrowDateRange}
                />
              );
            })}
          </EuiFlexGroup>
        </>
      );
    }
  }
);
