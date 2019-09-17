/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// @ts-ignore no module file
import { getLink } from '../../../jobs/jobs_list/components/job_actions/results';

interface Props {
  jobsList: any;
}

export const ExplorerLink: FC<Props> = ({ jobsList }) => {
  const openJobsInAnomalyExplorerText = i18n.translate(
    'xpack.ml.overviewAnomalyDetection.resultActions.openJobsInAnomalyExplorerText',
    {
      defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer',
      values: { jobsCount: jobsList.length, jobId: jobsList[0] && jobsList[0].id },
    }
  );

  return (
    <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
      <EuiButtonIcon
        href={getLink('explorer', jobsList)}
        iconType="tableOfContents"
        aria-label={openJobsInAnomalyExplorerText}
        className="results-button"
        data-test-subj={`openOverviewJobsInAnomalyExplorer`}
      />
    </EuiToolTip>
  );
};
