/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { toastNotifications } from 'ui/notify';
import { AnomalyDetectionTable } from './table';
import { ml } from '../../../services/ml_api_service';
import { getGroupsFromJobs, getStatsBarData, getJobsWithTimerange } from './utils';
import { Dictionary } from '../../../../../common/types/common';
import { MlSummaryJobs, MlSummaryJob } from '../../../../../common/types/jobs';

export type GroupsDictionary = Dictionary<Group>;

export interface Group {
  id: string;
  jobIds: string[];
  docs_processed: number;
  earliest_timestamp: number;
  latest_timestamp: number;
  max_anomaly_score: number | undefined | null;
}

type MaxScoresByGroup = Dictionary<{
  maxScore: number;
  index?: number;
}>;

const createJobLink = '#/jobs/new_job/step/index_or_search';

function getDefaultAnomalyScores(groups: Group[]): MaxScoresByGroup {
  const anomalyScores: MaxScoresByGroup = {};
  groups.forEach(group => {
    anomalyScores[group.id] = { maxScore: 0 };
  });

  return anomalyScores;
}

interface Props {
  jobCreationDisabled: boolean;
}

export const AnomalyDetectionPanel: FC<Props> = ({ jobCreationDisabled }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<GroupsDictionary>({});
  const [groupsCount, setGroupsCount] = useState<number>(0);
  const [jobsList, setJobsList] = useState<MlSummaryJobs>([]);
  const [statsBarData, setStatsBarData] = useState<any>(undefined);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);

  const loadJobs = async () => {
    setIsLoading(true);

    try {
      const jobsResult: MlSummaryJobs = await ml.jobs.jobsSummary([]);
      const jobsSummaryList = jobsResult.map((job: MlSummaryJob) => {
        job.latestTimestampSortValue = job.latestTimestampMs || 0;
        return job;
      });
      const { groups: jobsGroups, count } = getGroupsFromJobs(jobsSummaryList);
      const jobsWithTimerange = getJobsWithTimerange(jobsSummaryList);
      const stats = getStatsBarData(jobsSummaryList);
      setIsLoading(false);
      setErrorMessage(undefined);
      setStatsBarData(stats);
      setGroupsCount(count);
      setGroups(jobsGroups);
      setJobsList(jobsWithTimerange);
      loadMaxAnomalyScores(jobsGroups);
    } catch (e) {
      setErrorMessage(e.message !== undefined ? e.message : JSON.stringify(e));
      setIsLoading(false);
    }
  };

  const loadMaxAnomalyScores = async (groupsObject: GroupsDictionary) => {
    const groupsList: Group[] = Object.values(groupsObject);
    const scores = getDefaultAnomalyScores(groupsList);

    try {
      const promises = groupsList
        .filter(group => group.jobIds.length > 0)
        .map((group, i) => {
          scores[group.id].index = i;
          const latestTimestamp = group.latest_timestamp;
          const startMoment = moment(latestTimestamp);
          const twentyFourHoursAgo = startMoment.subtract(24, 'hours').valueOf();
          return ml.results.getMaxAnomalyScore(group.jobIds, twentyFourHoursAgo, latestTimestamp);
        });

      const results = await Promise.all(promises);
      const tempGroups = { ...groupsObject };
      // Check results for each group's promise index and update state
      Object.keys(scores).forEach(groupId => {
        const resultsIndex = scores[groupId] && scores[groupId].index;
        // maxScore will be null if it was not loaded correctly
        const { maxScore } = resultsIndex !== undefined && results[resultsIndex];
        tempGroups[groupId].max_anomaly_score = maxScore;
      });

      setGroups(tempGroups);
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.ml.overview.anomalyDetection.errorWithFetchingAnomalyScoreNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred fetching anomaly scores: {error}',
            values: { error: e.message !== undefined ? e.message : JSON.stringify(e) },
          }
        )
      );
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const onRefresh = () => {
    loadJobs();
  };

  const errorDisplay = (
    <Fragment>
      <EuiCallOut
        title={i18n.translate('xpack.ml.overview.anomalyDetection.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the anomaly detection jobs list.',
        })}
        color="danger"
        iconType="alert"
      >
        <pre>{errorMessage}</pre>
      </EuiCallOut>
    </Fragment>
  );

  const panelClass = isLoading ? 'mlOverviewPanel__isLoading' : 'mlOverviewPanel';

  return (
    <EuiPanel className={panelClass}>
      {typeof errorMessage !== 'undefined' && errorDisplay}
      {isLoading && <EuiLoadingSpinner className="mlOverviewPanel__spinner" size="xl" />}   
      {isLoading === false && typeof errorMessage === 'undefined' && groupsCount === 0 && (
        <EuiEmptyPrompt
          iconType="createSingleMetricJob"
          title={
            <h2>
              {i18n.translate('xpack.ml.overview.anomalyDetection.createFirstJobMessage', {
                defaultMessage: 'Create your first anomaly detection job',
              })}
            </h2>
          }
          body={
            <Fragment>
              <p>
                {i18n.translate('xpack.ml.overview.anomalyDetection.emptyPromptText', {
                  defaultMessage: `Machine learning makes it easy to detect anomalies in time series data stored in Elasticsearch. Track one metric from a single machine or hundreds of metrics across thousands of machines. Start automatically spotting the anomalies hiding in your data and resolve issues faster.`,
                })}
              </p>
            </Fragment>
          }
          actions={
            <EuiButton
              color="primary"
              href={createJobLink}
              fill
              iconType="plusInCircle"
              isDisabled={jobCreationDisabled}
            >
              {i18n.translate('xpack.ml.overview.anomalyDetection.createJobButtonText', {
                defaultMessage: 'Create job',
              })}
            </EuiButton>
          }
        />
      )}
      {isLoading === false && typeof errorMessage === 'undefined' && groupsCount > 0 && (
        <Fragment>
          <AnomalyDetectionTable items={groups} jobsList={jobsList} statsBarData={statsBarData} />
          <EuiSpacer size="m" />
          <div className="mlOverviewPanel__buttons">
            <EuiButtonEmpty size="s" onClick={onRefresh} className="mlOverviewPanel__refreshButton">
              {i18n.translate('xpack.ml.overview.anomalyDetection.refreshJobsButtonText', {
                defaultMessage: 'Refresh',
              })}
            </EuiButtonEmpty>
            <EuiButton size="s" fill href="#/jobs?">
              {i18n.translate('xpack.ml.overview.anomalyDetection.manageJobsButtonText', {
                defaultMessage: 'Manage jobs',
              })}
            </EuiButton>
          </div>
        </Fragment>
      )}
    </EuiPanel>
  );
};
