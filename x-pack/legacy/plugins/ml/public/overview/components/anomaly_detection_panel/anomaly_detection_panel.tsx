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
import { toastNotifications } from 'ui/notify';
import { AnomalyDetectionTable } from './table';
import { ml } from '../../../services/ml_api_service';
import { mlResultsService } from '../../../services/results_service';
import { getGroupsFromJobs, getStatsBarData, getJobsWithTimerange } from './utils';

export interface Groups {
  [key: string]: Group;
}

export interface Group {
  id: string;
  jobIds: string[];
  docs_processed: number;
  earliest_timestamp: number;
  latest_timestamp: number;
  max_anomaly_score: number | null;
}

export interface Job {
  [key: string]: any;
}

export type Jobs = Job[];

interface MaxScoresByGroup {
  [key: string]: {
    maxScore: number;
    index?: number;
  };
}

const createJobLink = '#/jobs/new_job/step/index_or_search';

function getDefaultAnomalyScores(groups: Group[]): MaxScoresByGroup {
  const anomalyScores: MaxScoresByGroup = {};
  groups.forEach(group => {
    anomalyScores[group.id] = { maxScore: 0 };
  });

  return anomalyScores;
}

export const AnomalyDetectionPanel: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<Groups>({});
  const [groupsCount, setGroupsCount] = useState<number>(0);
  const [jobsList, setJobsList] = useState<Jobs>([]);
  const [statsBarData, setStatsBarData] = useState<any>(undefined);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);

  const loadJobs = async () => {
    setIsLoading(true);

    try {
      const jobsResult: Jobs | any = await ml.jobs.jobsSummary([]);
      const jobsSummaryList = jobsResult.map((job: any) => {
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
      setErrorMessage(JSON.stringify(e));
      setIsLoading(false);
    }
  };

  const loadMaxAnomalyScores = async (groupsObject: Groups) => {
    const groupsList: Group[] = Object.values(groupsObject);
    const scores = getDefaultAnomalyScores(groupsList);

    try {
      const promises: any[] = [];
      groupsList.forEach((group, i) => {
        if (group.jobIds.length > 0) {
          scores[group.id].index = i;
          promises.push(
            mlResultsService.getOverallBucketScores(
              group.jobIds,
              1,
              group.earliest_timestamp,
              group.latest_timestamp
            )
          );
        }
      });

      const results = await Promise.all(promises);
      const tempGroups = Object.assign({}, { ...groupsObject });
      // Check results for each group's promise index and update state
      Object.keys(scores).forEach(groupId => {
        const resultsIndex = scores[groupId] && scores[groupId].index;
        const promiseResult: { success: boolean; results: { [key: string]: number } } =
          resultsIndex !== undefined && results[resultsIndex];
        if (promiseResult.success === true && promiseResult.results !== undefined) {
          const maxScore = Math.max(...Object.values(promiseResult.results));
          scores[groupId] = { maxScore };
          tempGroups[groupId].max_anomaly_score = maxScore;
        }
      });

      setGroups(tempGroups);
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.ml.overview.anomalyDetection.errorWithFetchingAnomalyScoreNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred fetching anomaly scores: {error}',
            values: { error: JSON.stringify(e) },
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
        <pre>{JSON.stringify(errorMessage)}</pre>
      </EuiCallOut>
    </Fragment>
  );

  return (
    <EuiPanel className="mlOverviewPanel">
      {typeof errorMessage !== 'undefined' && errorDisplay}
      {isLoading && <EuiLoadingSpinner />}   
      {isLoading === false && typeof errorMessage === 'undefined' && groupsCount === 0 && (
        <EuiEmptyPrompt
          iconType="createSingleMetricJob"
          title={<h2>Create your first anomaly detection job</h2>}
          body={
            <Fragment>
              <p>
                Machine learning makes it easy to detect anomalies in time series data stored in
                Elasticsearch. Track one metric from a single machine or hundreds of metrics across
                thousands of machines. Start automatically spotting the anomalies hiding in your
                data and resolve issues faster.              
              </p>
            </Fragment>
          }
          actions={
            <EuiButton color="primary" href={createJobLink} fill>
              Create job
            </EuiButton>
          }
        />
      )}
      {isLoading === false && typeof errorMessage === 'undefined' && groupsCount > 0 && (
        <Fragment>
          <AnomalyDetectionTable items={groups} jobsList={jobsList} statsBarData={statsBarData} />
          <EuiSpacer size="m" />
          <div className="mlOverviewPanel__buttons">
            <EuiButtonEmpty size="s" onClick={onRefresh}>
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
