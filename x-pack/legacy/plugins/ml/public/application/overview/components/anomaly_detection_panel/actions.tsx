/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiToolTip, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// @ts-ignore no module file
import { getLink } from '../../../jobs/jobs_list/components/job_actions/results';
import { MlSummaryJobs } from '../../../../../common/types/jobs';

interface Props {
  jobsList: MlSummaryJobs;
}

export const ExplorerLink: FC<Props> = ({ jobsList }) => {
  const openJobsInAnomalyExplorerText = i18n.translate(
    'xpack.ml.overview.anomalyDetection.resultActions.openJobsInAnomalyExplorerText',
    {
      defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer',
      values: { jobsCount: jobsList.length, jobId: jobsList[0] && jobsList[0].id },
    }
  );

  return (
    <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
      <EuiButtonEmpty
        color="text"
        size="xs"
        href={getLink('explorer', jobsList)}
        iconType="tableOfContents"
        aria-label={openJobsInAnomalyExplorerText}
        className="results-button"
        data-test-subj={`openOverviewJobsInAnomalyExplorer`}
      >
        {i18n.translate('xpack.ml.overview.anomalyDetection.exploreActionName', {
          defaultMessage: 'Explore',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
