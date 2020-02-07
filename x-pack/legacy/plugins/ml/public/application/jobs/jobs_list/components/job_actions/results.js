/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import chrome from 'ui/chrome';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { mlJobService } from '../../../../services/job_service';
import { injectI18n } from '@kbn/i18n/react';

export function getLink(location, jobs) {
  const resultsPageUrl = mlJobService.createResultsUrlForJobs(jobs, location);
  return `${chrome.getBasePath()}/app/ml${resultsPageUrl}`;
}

function ResultLinksUI({ jobs, intl }) {
  const openJobsInSingleMetricViewerText = intl.formatMessage(
    {
      id: 'xpack.ml.jobsList.resultActions.openJobsInSingleMetricViewerText',
      defaultMessage:
        'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Single Metric Viewer',
    },
    {
      jobsCount: jobs.length,
      jobId: jobs[0].id,
    }
  );
  const openJobsInAnomalyExplorerText = intl.formatMessage(
    {
      id: 'xpack.ml.jobsList.resultActions.openJobsInAnomalyExplorerText',
      defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer',
    },
    {
      jobsCount: jobs.length,
      jobId: jobs[0].id,
    }
  );
  const singleMetricVisible = jobs.length < 2;
  const singleMetricEnabled = jobs.length === 1 && jobs[0].isSingleMetricViewerJob;
  const jobActionsDisabled = jobs.length === 1 && jobs[0].deleting === true;

  return (
    <React.Fragment>
      {singleMetricVisible && (
        <EuiToolTip position="bottom" content={openJobsInSingleMetricViewerText}>
          <EuiButtonIcon
            href={getLink('timeseriesexplorer', jobs)}
            iconType="stats"
            aria-label={openJobsInSingleMetricViewerText}
            className="results-button"
            isDisabled={singleMetricEnabled === false || jobActionsDisabled === true}
            data-test-subj={`openJobsInSingleMetricViewer openJobsInSingleMetricViewer-${jobs[0].id}`}
          />
        </EuiToolTip>
      )}
      <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
        <EuiButtonIcon
          href={getLink('explorer', jobs)}
          iconType="tableOfContents"
          aria-label={openJobsInAnomalyExplorerText}
          className="results-button"
          isDisabled={jobActionsDisabled === true}
          data-test-subj={`openJobsInAnomalyExplorer openJobsInSingleAnomalyExplorer-${jobs[0].id}`}
        />
      </EuiToolTip>
      <div className="actions-border" />
    </React.Fragment>
  );
}
ResultLinksUI.propTypes = {
  jobs: PropTypes.array.isRequired,
};

export const ResultLinks = injectI18n(ResultLinksUI);
