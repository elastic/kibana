/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import { TabSummary, TabTerms, TabMetrics, TabJson, TabHistogram, TabRequest } from './tabs';

export const JOB_DETAILS_TAB_SUMMARY = 'JOB_DETAILS_TAB_SUMMARY';
export const JOB_DETAILS_TAB_TERMS = 'JOB_DETAILS_TAB_TERMS';
export const JOB_DETAILS_TAB_HISTOGRAM = 'JOB_DETAILS_TAB_HISTOGRAM';
export const JOB_DETAILS_TAB_METRICS = 'JOB_DETAILS_TAB_METRICS';
export const JOB_DETAILS_TAB_JSON = 'JOB_DETAILS_TAB_JSON';
export const JOB_DETAILS_TAB_REQUEST = 'JOB_DETAILS_TAB_REQUEST';

export const tabToHumanizedMap = {
  [JOB_DETAILS_TAB_SUMMARY]: (
    <FormattedMessage
      id="xpack.rollupJobs.create.jobDetails.tabSummaryLabel"
      defaultMessage="Summary"
    />
  ),
  [JOB_DETAILS_TAB_TERMS]: (
    <FormattedMessage
      id="xpack.rollupJobs.create.jobDetails.tabTermsLabel"
      defaultMessage="Terms"
    />
  ),
  [JOB_DETAILS_TAB_HISTOGRAM]: (
    <FormattedMessage
      id="xpack.rollupJobs.create.jobDetails.tabHistogramLabel"
      defaultMessage="Histogram"
    />
  ),
  [JOB_DETAILS_TAB_METRICS]: (
    <FormattedMessage
      id="xpack.rollupJobs.create.jobDetails.tabMetricsLabel"
      defaultMessage="Metrics"
    />
  ),
  [JOB_DETAILS_TAB_JSON]: (
    <FormattedMessage id="xpack.rollupJobs.create.jobDetails.tabJsonLabel" defaultMessage="JSON" />
  ),
  [JOB_DETAILS_TAB_REQUEST]: (
    <FormattedMessage
      id="xpack.rollupJobs.create.jobDetails.tabRequestLabel"
      defaultMessage="Request"
    />
  ),
};

const JOB_DETAILS_TABS = [
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_JSON,
  JOB_DETAILS_TAB_REQUEST,
];

export const JobDetails = ({ tab, job, stats, json, endpoint }) => {
  const { metrics, terms, histogram, histogramInterval } = job;

  const tabToContentMap = {
    [JOB_DETAILS_TAB_SUMMARY]: <TabSummary job={job} stats={stats} />,
    [JOB_DETAILS_TAB_TERMS]: <TabTerms terms={terms} />,
    [JOB_DETAILS_TAB_HISTOGRAM]: (
      <TabHistogram histogram={histogram} histogramInterval={histogramInterval} />
    ),
    [JOB_DETAILS_TAB_METRICS]: <TabMetrics metrics={metrics} />,
    [JOB_DETAILS_TAB_JSON]: <TabJson json={json} />,
    [JOB_DETAILS_TAB_REQUEST]: <TabRequest json={json} endpoint={endpoint} />,
  };

  return tabToContentMap[tab];
};

JobDetails.propTypes = {
  tab: PropTypes.oneOf(JOB_DETAILS_TABS),
  job: PropTypes.object,
};
