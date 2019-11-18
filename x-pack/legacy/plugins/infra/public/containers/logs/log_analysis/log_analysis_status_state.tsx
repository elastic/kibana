/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';

import {
  getDatafeedId,
  getJobId,
  isJobStatusWithResults,
  JobStatus,
  JobType,
  jobTypeRT,
  SetupStatus,
} from '../../../../common/log_analysis';
import { FetchJobStatusResponsePayload, JobSummary } from './api/ml_get_jobs_summary_api';
import { GetMlModuleResponsePayload, JobDefinition } from './api/ml_get_module';
import { SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { MandatoryProperty } from '../../../../common/utility_types';

interface StatusReducerState {
  jobDefinitions: JobDefinition[];
  jobStatus: Record<JobType, JobStatus>;
  jobSummaries: JobSummary[];
  lastSetupErrorMessages: string[];
  setupStatus: SetupStatus;
  sourceConfiguration: JobSourceConfiguration;
}

type StatusReducerAction =
  | { type: 'startedSetup' }
  | {
      type: 'finishedSetup';
      sourceId: string;
      spaceId: string;
      jobs: SetupMlModuleResponsePayload['jobs'];
      datafeeds: SetupMlModuleResponsePayload['datafeeds'];
    }
  | { type: 'failedSetup' }
  | { type: 'fetchingJobStatuses' }
  | {
      type: 'fetchedJobStatuses';
      spaceId: string;
      sourceId: string;
      payload: FetchJobStatusResponsePayload;
    }
  | { type: 'failedFetchingJobStatuses' }
  | { type: 'fetchingModuleDefinition' }
  | {
      type: 'fetchedModuleDefinition';
      spaceId: string;
      sourceId: string;
      moduleDefinition: GetMlModuleResponsePayload;
    }
  | { type: 'failedFetchingModuleDefinition' }
  | {
      type: 'updatedSourceConfiguration';
      spaceId: string;
      sourceId: string;
      sourceConfiguration: JobSourceConfiguration;
    }
  | { type: 'requestedJobConfigurationUpdate' }
  | { type: 'requestedJobDefinitionUpdate' }
  | { type: 'viewedResults' };

const createInitialState = (sourceConfiguration: JobSourceConfiguration): StatusReducerState => ({
  jobDefinitions: [],
  jobStatus: {
    'log-entry-rate': 'unknown',
  },
  jobSummaries: [],
  lastSetupErrorMessages: [],
  setupStatus: 'initializing',
  sourceConfiguration,
});

function statusReducer(state: StatusReducerState, action: StatusReducerAction): StatusReducerState {
  switch (action.type) {
    case 'startedSetup': {
      return {
        ...state,
        jobStatus: {
          'log-entry-rate': 'initializing',
        },
        setupStatus: 'pending',
      };
    }
    case 'finishedSetup': {
      const { jobs, datafeeds, spaceId, sourceId } = action;
      const nextJobStatus = {
        ...state.jobStatus,
        'log-entry-rate':
          hasSuccessfullyCreatedJob(getJobId(spaceId, sourceId, 'log-entry-rate'))(jobs) &&
          hasSuccessfullyStartedDatafeed(getDatafeedId(spaceId, sourceId, 'log-entry-rate'))(
            datafeeds
          )
            ? ('started' as JobStatus)
            : ('failed' as JobStatus),
      };
      const nextSetupStatus = Object.values(nextJobStatus).every(jobState =>
        ['started'].includes(jobState)
      )
        ? 'succeeded'
        : 'failed';
      const nextErrorMessages = [
        ...Object.values(datafeeds)
          .filter(hasError)
          .map(datafeed => datafeed.error.msg),
        ...Object.values(jobs)
          .filter(hasError)
          .map(job => job.error.msg),
      ];
      return {
        ...state,
        jobStatus: nextJobStatus,
        lastSetupErrorMessages: nextErrorMessages,
        setupStatus: nextSetupStatus,
      };
    }
    case 'failedSetup': {
      return {
        ...state,
        jobStatus: {
          ...state.jobStatus,
          'log-entry-rate': 'failed',
        },
        setupStatus: 'failed',
      };
    }
    case 'fetchingModuleDefinition':
    case 'fetchingJobStatuses': {
      return {
        ...state,
        setupStatus: state.setupStatus === 'unknown' ? 'initializing' : state.setupStatus,
      };
    }
    case 'fetchedJobStatuses': {
      const { payload: jobSummaries, spaceId, sourceId } = action;
      const { jobDefinitions, setupStatus, sourceConfiguration } = state;

      const nextJobStatus = {
        ...state.jobStatus,
        'log-entry-rate': getJobStatus(getJobId(spaceId, sourceId, 'log-entry-rate'))(jobSummaries),
      };
      const nextSetupStatus = getSetupStatus(
        spaceId,
        sourceId,
        sourceConfiguration,
        nextJobStatus,
        jobDefinitions,
        jobSummaries
      )(setupStatus);

      return {
        ...state,
        jobSummaries,
        jobStatus: nextJobStatus,
        setupStatus: nextSetupStatus,
      };
    }
    case 'failedFetchingJobStatuses': {
      return {
        ...state,
        setupStatus: 'unknown',
        jobStatus: {
          ...state.jobStatus,
          'log-entry-rate': 'unknown',
        },
      };
    }
    case 'fetchedModuleDefinition': {
      const { spaceId, sourceId, moduleDefinition } = action;
      const { jobStatus, jobSummaries, setupStatus, sourceConfiguration } = state;

      const nextSetupStatus = getSetupStatus(
        spaceId,
        sourceId,
        sourceConfiguration,
        jobStatus,
        moduleDefinition.jobs,
        jobSummaries
      )(setupStatus);

      return {
        ...state,
        jobDefinitions: moduleDefinition.jobs,
        setupStatus: nextSetupStatus,
      };
    }
    case 'updatedSourceConfiguration': {
      const { spaceId, sourceId, sourceConfiguration } = action;
      const { jobDefinitions, jobStatus, jobSummaries, setupStatus } = state;

      const nextSetupStatus = getSetupStatus(
        spaceId,
        sourceId,
        sourceConfiguration,
        jobStatus,
        jobDefinitions,
        jobSummaries
      )(setupStatus);

      return {
        ...state,
        setupStatus: nextSetupStatus,
        sourceConfiguration,
      };
    }
    case 'requestedJobConfigurationUpdate': {
      return {
        ...state,
        setupStatus: 'requiredForReconfiguration',
      };
    }
    case 'requestedJobDefinitionUpdate': {
      return {
        ...state,
        setupStatus: 'requiredForUpdate',
      };
    }
    case 'viewedResults': {
      return {
        ...state,
        setupStatus: 'hiddenAfterSuccess',
      };
    }
    default: {
      return state;
    }
  }
}

const hasSuccessfullyCreatedJob = (jobId: string) => (
  jobSetupResponses: SetupMlModuleResponsePayload['jobs']
) =>
  jobSetupResponses.filter(
    jobSetupResponse =>
      jobSetupResponse.id === jobId && jobSetupResponse.success && !jobSetupResponse.error
  ).length > 0;

const hasSuccessfullyStartedDatafeed = (datafeedId: string) => (
  datafeedSetupResponses: SetupMlModuleResponsePayload['datafeeds']
) =>
  datafeedSetupResponses.filter(
    datafeedSetupResponse =>
      datafeedSetupResponse.id === datafeedId &&
      datafeedSetupResponse.success &&
      datafeedSetupResponse.started &&
      !datafeedSetupResponse.error
  ).length > 0;

const getJobStatus = (jobId: string) => (jobSummaries: FetchJobStatusResponsePayload): JobStatus =>
  jobSummaries
    .filter(jobSummary => jobSummary.id === jobId)
    .map(
      (jobSummary): JobStatus => {
        if (jobSummary.jobState === 'failed' || jobSummary.datafeedState === '') {
          return 'failed';
        } else if (
          jobSummary.jobState === 'closed' &&
          jobSummary.datafeedState === 'stopped' &&
          jobSummary.fullJob &&
          jobSummary.fullJob.finished_time != null
        ) {
          return 'finished';
        } else if (
          jobSummary.jobState === 'closed' ||
          jobSummary.jobState === 'closing' ||
          jobSummary.datafeedState === 'stopped'
        ) {
          return 'stopped';
        } else if (jobSummary.jobState === 'opening') {
          return 'initializing';
        } else if (jobSummary.jobState === 'opened' && jobSummary.datafeedState === 'started') {
          return 'started';
        }

        return 'unknown';
      }
    )[0] || 'missing';

const getSetupStatus = (
  spaceId: string,
  sourceId: string,
  sourceConfiguration: JobSourceConfiguration,
  everyJobStatus: Record<JobType, JobStatus>,
  jobDefinitions: JobDefinition[],
  jobSummaries: JobSummary[]
) => (previousSetupStatus: SetupStatus) =>
  Object.entries(everyJobStatus).reduce<SetupStatus>((setupStatus, [jobType, jobStatus]) => {
    if (!jobTypeRT.is(jobType)) {
      return setupStatus;
    }

    const jobId = getJobId(spaceId, sourceId, jobType);
    const jobDefinition = jobDefinitions.find(({ id }) => id === jobType);

    if (jobStatus === 'missing') {
      return 'required';
    } else if (
      setupStatus === 'required' ||
      setupStatus === 'requiredForUpdate' ||
      setupStatus === 'requiredForReconfiguration'
    ) {
      return setupStatus;
    } else if (
      setupStatus === 'skippedButUpdatable' ||
      (jobDefinition &&
        !isJobRevisionCurrent(
          jobId,
          jobDefinition.config.custom_settings.job_revision || 0
        )(jobSummaries))
    ) {
      return 'skippedButUpdatable';
    } else if (
      setupStatus === 'skippedButReconfigurable' ||
      !isJobConfigurationConsistent(jobId, sourceConfiguration)(jobSummaries)
    ) {
      return 'skippedButReconfigurable';
    } else if (setupStatus === 'hiddenAfterSuccess') {
      return setupStatus;
    } else if (setupStatus === 'skipped' || isJobStatusWithResults(jobStatus)) {
      return 'skipped';
    }

    return setupStatus;
  }, previousSetupStatus);

const isJobRevisionCurrent = (jobId: string, currentRevision: number) => (
  jobSummaries: FetchJobStatusResponsePayload
): boolean =>
  jobSummaries
    .filter(jobSummary => jobSummary.id === jobId)
    .every(
      jobSummary =>
        jobSummary.fullJob &&
        jobSummary.fullJob.custom_settings &&
        jobSummary.fullJob.custom_settings.job_revision &&
        jobSummary.fullJob.custom_settings.job_revision >= currentRevision
    );

const isJobConfigurationConsistent = (
  jobId: string,
  sourceConfiguration: {
    bucketSpan: number;
    indexPattern: string;
    timestampField: string;
  }
) => (jobSummaries: FetchJobStatusResponsePayload): boolean =>
  jobSummaries
    .filter(jobSummary => jobSummary.id === jobId)
    .every(jobSummary => {
      if (!jobSummary.fullJob || !jobSummary.fullJob.custom_settings) {
        return false;
      }

      const jobConfiguration = jobSummary.fullJob.custom_settings.logs_source_config;

      return (
        jobConfiguration &&
        jobConfiguration.bucketSpan === sourceConfiguration.bucketSpan &&
        jobConfiguration.indexPattern &&
        isIndexPatternSubset(jobConfiguration.indexPattern, sourceConfiguration.indexPattern) &&
        jobConfiguration.timestampField === sourceConfiguration.timestampField
      );
    });

const isIndexPatternSubset = (indexPatternSubset: string, indexPatternSuperset: string) => {
  const subsetSubPatterns = indexPatternSubset.split(',');
  const supersetSubPatterns = new Set(indexPatternSuperset.split(','));

  return subsetSubPatterns.every(subPattern => supersetSubPatterns.has(subPattern));
};

const hasError = <Value extends any>(value: Value): value is MandatoryProperty<Value, 'error'> =>
  value.error != null;

export const useStatusState = (sourceConfiguration: JobSourceConfiguration) => {
  return useReducer(statusReducer, sourceConfiguration, createInitialState);
};

interface JobSourceConfiguration {
  bucketSpan: number;
  indexPattern: string;
  timestampField: string;
}
