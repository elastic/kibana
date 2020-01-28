/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import {
  CheckRecognizerProps,
  CloseJobsResponse,
  ErrorResponse,
  GetModulesProps,
  JobSummary,
  MlSetupArgs,
  Module,
  RecognizerModule,
  SetupMlResponse,
  StartDatafeedResponse,
  StopDatafeedResponse,
} from './types';
import { throwIfErrorAttached, throwIfErrorAttachedToSetup } from '../ml/api/throw_if_not_ok';
import { throwIfNotOk } from '../../hooks/api/api';

/**
 * Checks the ML Recognizer API to see if a given indexPattern has any compatible modules
 *
 * @param indexPatternName ES index pattern to check for compatible modules
 * @param signal to cancel request
 */
export const checkRecognizer = async ({
  indexPatternName,
  signal,
}: CheckRecognizerProps): Promise<RecognizerModule[]> => {
  const response = await npStart.core.http.fetch<RecognizerModule[]>(
    `/api/ml/modules/recognize/${indexPatternName}`,
    {
      method: 'GET',
      asResponse: true,
      asSystemRequest: true,
      signal,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Returns ML Module for given moduleId. Returns all modules if no moduleId specified
 *
 * @param moduleId id of the module to retrieve
 * @param signal to cancel request
 */
export const getModules = async ({ moduleId = '', signal }: GetModulesProps): Promise<Module[]> => {
  const response = await npStart.core.http.fetch<Module[]>(
    `/api/ml/modules/get_module/${moduleId}`,
    {
      method: 'GET',
      asResponse: true,
      asSystemRequest: true,
      signal,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Creates ML Jobs + Datafeeds for the given configTemplate + indexPatternName
 *
 * @param configTemplate - name of configTemplate to setup
 * @param indexPatternName - default index pattern configTemplate should be installed with
 * @param jobIdErrorFilter - if provided, filters all errors except for given jobIds
 * @param groups - list of groups to add to jobs being installed
 * @param prefix - prefix to be added to job name
 */
export const setupMlJob = async ({
  configTemplate,
  indexPatternName = 'auditbeat-*',
  jobIdErrorFilter = [],
  groups = ['siem'],
  prefix = '',
}: MlSetupArgs): Promise<SetupMlResponse> => {
  const response = await npStart.core.http.fetch<SetupMlResponse>(
    `/api/ml/modules/setup/${configTemplate}`,
    {
      method: 'POST',
      body: JSON.stringify({
        prefix,
        groups,
        indexPatternName,
        startDatafeed: false,
        useDedicatedIndex: true,
      }),
      asResponse: true,
      asSystemRequest: true,
    }
  );

  await throwIfNotOk(response.response);
  const json = response.body!;
  throwIfErrorAttachedToSetup(json, jobIdErrorFilter);

  return json;
};

/**
 * Starts the given dataFeedIds
 *
 * @param datafeedIds
 * @param start
 */
export const startDatafeeds = async ({
  datafeedIds,
  start = 0,
}: {
  datafeedIds: string[];
  start: number;
}): Promise<StartDatafeedResponse> => {
  const response = await npStart.core.http.fetch<StartDatafeedResponse>(
    '/api/ml/jobs/force_start_datafeeds',
    {
      method: 'POST',
      body: JSON.stringify({
        datafeedIds,
        ...(start !== 0 && { start }),
      }),
      asResponse: true,
      asSystemRequest: true,
    }
  );

  await throwIfNotOk(response.response);
  const json = response.body!;
  throwIfErrorAttached(json, datafeedIds);

  return json;
};

/**
 * Stops the given dataFeedIds and sets the corresponding Job's jobState to closed
 *
 * @param datafeedIds
 */
export const stopDatafeeds = async ({
  datafeedIds,
}: {
  datafeedIds: string[];
}): Promise<[StopDatafeedResponse | ErrorResponse, CloseJobsResponse]> => {
  const stopDatafeedsResponse = await npStart.core.http.fetch<StopDatafeedResponse>(
    '/api/ml/jobs/stop_datafeeds',
    {
      method: 'POST',
      body: JSON.stringify({
        datafeedIds,
      }),
      asResponse: true,
      asSystemRequest: true,
    }
  );

  await throwIfNotOk(stopDatafeedsResponse.response);
  const stopDatafeedsResponseJson = stopDatafeedsResponse.body!;

  const datafeedPrefix = 'datafeed-';
  const closeJobsResponse = await npStart.core.http.fetch<CloseJobsResponse>(
    '/api/ml/jobs/close_jobs',
    {
      method: 'POST',
      body: JSON.stringify({
        jobIds: datafeedIds.map(dataFeedId =>
          dataFeedId.startsWith(datafeedPrefix)
            ? dataFeedId.substring(datafeedPrefix.length)
            : dataFeedId
        ),
      }),
      asResponse: true,
      asSystemRequest: true,
    }
  );

  await throwIfNotOk(closeJobsResponse.response);
  return [stopDatafeedsResponseJson, closeJobsResponse.body!];
};

/**
 * Fetches a summary of all ML jobs currently installed
 *
 * NOTE: If not sending jobIds in the body, you must at least send an empty body or the server will
 * return a 500
 *
 * @param signal to cancel request
 */
export const getJobsSummary = async (signal: AbortSignal): Promise<JobSummary[]> => {
  const response = await npStart.core.http.fetch<JobSummary[]>('/api/ml/jobs/jobs_summary', {
    method: 'POST',
    body: JSON.stringify({}),
    asResponse: true,
    asSystemRequest: true,
    signal,
  });

  await throwIfNotOk(response.response);
  return response.body!;
};
