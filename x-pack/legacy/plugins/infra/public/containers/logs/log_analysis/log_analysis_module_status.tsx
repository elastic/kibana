/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';

import {
  JobSourceConfiguration,
  JobStatus,
  SetupStatus,
  getDatafeedId,
  getJobId,
  isJobStatusWithResults,
} from '../../../../common/log_analysis';
import { FetchJobStatusResponsePayload, JobSummary } from './api/ml_get_jobs_summary_api';
import { GetMlModuleResponsePayload, JobDefinition } from './api/ml_get_module';
import { SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { MandatoryProperty } from '../../../../common/utility_types';

interface StatusReducerState<JobType extends string> {
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

const createInitialState = <JobType extends string>({
  jobTypes,
  sourceConfiguration,
}: {
  jobTypes: JobType[];
  sourceConfiguration: JobSourceConfiguration;
}): StatusReducerState<JobType> => ({
  jobDefinitions: [],
  jobStatus: jobTypes.reduce(
    (accumulatedJobStatus, jobType) => ({
      ...accumulatedJobStatus,
      [jobType]: 'unknown',
    }),
    {} as Record<JobType, JobStatus>
  ),
  jobSummaries: [],
  lastSetupErrorMessages: [],
  setupStatus: 'initializing',
  sourceConfiguration,
});

const createStatusReducer = <JobType extends string>(jobTypes: JobType[]) => (
  state: StatusReducerState<JobType>,
  action: StatusReducerAction
): StatusReducerState<JobType> => {
  switch (action.type) {
    case 'startedSetup': {
      return {
        ...state,
        jobStatus: jobTypes.reduce(
          (accumulatedJobStatus, jobType) => ({
            ...accumulatedJobStatus,
            [jobType]: 'initializing',
          }),
          {} as Record<JobType, JobStatus>
        ),
        setupStatus: 'pending',
      };
    }
    case 'finishedSetup': {
      const { jobs, datafeeds, spaceId, sourceId } = action;
      const nextJobStatus = jobTypes.reduce(
        (accumulatedJobStatus, jobType) => ({
          ...accumulatedJobStatus,
          [jobType]:
            hasSuccessfullyCreatedJob(getJobId(spaceId, sourceId, jobType))(jobs) &&
            hasSuccessfullyStartedDatafeed(getDatafeedId(spaceId, sourceId, jobType))(datafeeds)
              ? 'started'
              : 'failed',
        }),
        {} as Record<JobType, JobStatus>
      );
      const nextSetupStatus = Object.values<JobStatus>(nextJobStatus).every(
        jobState => jobState === 'started'
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
        jobStatus: jobTypes.reduce(
          (accumulatedJobStatus, jobType) => ({
            ...accumulatedJobStatus,
            [jobType]: 'failed',
          }),
          {} as Record<JobType, JobStatus>
        ),
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

      const nextJobStatus = jobTypes.reduce(
        (accumulatedJobStatus, jobType) => ({
          ...accumulatedJobStatus,
          [jobType]: getJobStatus(getJobId(spaceId, sourceId, jobType))(jobSummaries),
        }),
        {} as Record<JobType, JobStatus>
      );
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
        jobStatus: jobTypes.reduce(
          (accumulatedJobStatus, jobType) => ({
            ...accumulatedJobStatus,
            [jobType]: 'unknown',
          }),
          {} as Record<JobType, JobStatus>
        ),
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
};

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

const getSetupStatus = <JobType extends string>(
  spaceId: string,
  sourceId: string,
  sourceConfiguration: JobSourceConfiguration,
  everyJobStatus: Record<JobType, JobStatus>,
  jobDefinitions: JobDefinition[],
  jobSummaries: JobSummary[]
) => (previousSetupStatus: SetupStatus) =>
  Object.entries<JobStatus>(everyJobStatus).reduce<SetupStatus>(
    (setupStatus, [jobType, jobStatus]) => {
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
    },
    previousSetupStatus
  );

const isJobRevisionCurrent = (jobId: string, currentRevision: number) => (
  jobSummaries: FetchJobStatusResponsePayload
): boolean =>
  jobSummaries
    .filter(jobSummary => jobSummary.id === jobId)
    .every(
      jobSummary => (jobSummary?.fullJob?.custom_settings?.job_revision ?? 0) >= currentRevision
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

export const useModuleStatus = <JobType extends string>(
  jobTypes: JobType[],
  sourceConfiguration: JobSourceConfiguration
) => {
  return useReducer(
    createStatusReducer(jobTypes),
    { jobTypes, sourceConfiguration },
    createInitialState
  );
};
