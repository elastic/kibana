/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
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
  const response = await fetch(
    `${chrome.getBasePath()}/api/ml/modules/recognize/${indexPatternName}`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-system-api': 'true',
        'kbn-xsrf': 'true',
      },
      signal,
    }
  );
  await throwIfNotOk(response);
  return response.json();
};

/**
 * Returns ML Module for given moduleId. Returns all modules if no moduleId specified
 *
 * @param moduleId id of the module to retrieve
 * @param signal to cancel request
 */
export const getModules = async ({ moduleId = '', signal }: GetModulesProps): Promise<Module[]> => {
  const response = await fetch(`${chrome.getBasePath()}/api/ml/modules/get_module/${moduleId}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
    signal,
  });
  await throwIfNotOk(response);
  return response.json();
};

/**
 * Creates ML Jobs + Datafeeds for the given configTemplate + indexPatternName
 *
 * @param configTemplate - name of configTemplate to setup
 * @param indexPatternName - default index pattern configTemplate should be installed with
 * @param jobIdErrorFilter - if provided, filters all errors except for given jobIds
 * @param groups - list of groups to add to jobs being installed
 * @param prefix - prefix to be added to job name
 * @param headers optional headers to add
 */
export const setupMlJob = async ({
  configTemplate,
  indexPatternName = 'auditbeat-*',
  jobIdErrorFilter = [],
  groups = ['siem'],
  prefix = '',
}: MlSetupArgs): Promise<SetupMlResponse> => {
  const response = await fetch(`${chrome.getBasePath()}/api/ml/modules/setup/${configTemplate}`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      prefix,
      groups,
      indexPatternName,
      startDatafeed: false,
      useDedicatedIndex: true,
    }),
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
  });
  await throwIfNotOk(response);
  const json = await response.json();
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
  const response = await fetch(`${chrome.getBasePath()}/api/ml/jobs/force_start_datafeeds`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      datafeedIds,
      ...(start !== 0 && { start }),
    }),
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
  });
  await throwIfNotOk(response);
  const json = await response.json();
  throwIfErrorAttached(json, datafeedIds);
  return json;
};

/**
 * Stops the given dataFeedIds and sets the corresponding Job's jobState to closed
 *
 * @param datafeedIds
 * @param headers optional headers to add
 */
export const stopDatafeeds = async ({
  datafeedIds,
}: {
  datafeedIds: string[];
}): Promise<[StopDatafeedResponse | ErrorResponse, CloseJobsResponse]> => {
  const stopDatafeedsResponse = await fetch(`${chrome.getBasePath()}/api/ml/jobs/stop_datafeeds`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      datafeedIds,
    }),
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
  });

  await throwIfNotOk(stopDatafeedsResponse);
  const stopDatafeedsResponseJson = await stopDatafeedsResponse.json();

  const datafeedPrefix = 'datafeed-';
  const closeJobsResponse = await fetch(`${chrome.getBasePath()}/api/ml/jobs/close_jobs`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      jobIds: datafeedIds.map(dataFeedId =>
        dataFeedId.startsWith(datafeedPrefix)
          ? dataFeedId.substring(datafeedPrefix.length)
          : dataFeedId
      ),
    }),
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
  });

  await throwIfNotOk(closeJobsResponse);
  return [stopDatafeedsResponseJson, await closeJobsResponse.json()];
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
  const response = await fetch(`${chrome.getBasePath()}/api/ml/jobs/jobs_summary`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({}),
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': 'true',
    },
    signal,
  });
  await throwIfNotOk(response);
  return response.json();
};
