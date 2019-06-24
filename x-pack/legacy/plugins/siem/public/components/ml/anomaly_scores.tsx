/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiLoadingSpinner, EuiPopover, EuiDescriptionList } from '@elastic/eui';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { getEmptyTagValue } from '../empty_value';
import { Anomalies, Anomaly, NarrowDateRange } from './types';
import { getTopSeverityJobs } from './get_top_severity';
import { DraggableScore } from './draggable_score';
import { createDescriptionsList } from './create_descriptions_list';

interface Args {
  startDate: number;
  endDate: number;
  anomalies: Anomalies | null;
  isLoading: boolean;
  narrowDateRange: NarrowDateRange;
}

export const createJobKey = (score: Anomaly): string =>
  `${score.jobId}-${score.severity}-${score.entityName}-${score.entityValue}`;

export const AnomalyScores = React.memo<Args>(
  ({ anomalies, startDate, endDate, isLoading, narrowDateRange }): JSX.Element => {
    if (isLoading) {
      return <EuiLoadingSpinner size="m" />;
    } else if (
      anomalies == null ||
      anomalies.anomalies.length === 0 ||
      startDate == null ||
      endDate == null
    ) {
      return getEmptyTagValue();
    } else {
      return (
        <>
          {getTopSeverityJobs(anomalies.anomalies).map((score, index) => {
            const jobKey = createJobKey(score);
            const [isOpen, setIsOpen] = useState(false);
            return (
              <EuiPopover
                key={jobKey}
                id="anomaly-score-popover"
                isOpen={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                closePopover={() => setIsOpen(!isOpen)}
                button={
                  <DraggableScore
                    id={escapeDataProviderId(`anomaly-scores-${jobKey}`)}
                    index={index}
                    score={score}
                  />
                }
              >
                <EuiDescriptionList
                  listItems={createDescriptionsList(
                    score,
                    startDate,
                    endDate,
                    anomalies.interval,
                    narrowDateRange
                  )}
                />
              </EuiPopover>
            );
          })}
        </>
      );
    }
  }
);
