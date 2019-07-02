/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  CloseJobsResponse,
  Group,
  Job,
  MlSetupArgs,
  SetupMlResponse,
  StartDatafeedResponse,
  StopDatafeedResponse,
} from './types';
import { throwIfNotOk } from '../ml/api/throw_if_not_ok';

const emptyGroup: Group[] = [];

const emptyMlResponse: SetupMlResponse = { jobs: [], datafeeds: [], kibana: {} };

const emptyStartDatafeedResponse: StartDatafeedResponse = {};

const emptyStopDatafeeds: [StopDatafeedResponse, CloseJobsResponse] = [{}, {}];

const emptyJob: Job[] = [];

/**
 * Fetches ML Groups Data
 *
 * @param headers
 */
export const groupsData = async (headers: Record<string, string | undefined>): Promise<Group[]> => {
  try {
    const response = await fetch('/api/ml/jobs/groups', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-system-api': 'true',
        'kbn-xsrf': chrome.getXsrfToken(),
        ...headers,
      },
    });
    await throwIfNotOk(response);
    return await response.json();
  } catch (error) {
    // TODO: Toaster error when this happens instead of returning empty data
    return emptyGroup;
  }
};

/**
 * Creates ML Jobs + Datafeeds for the given configTemplate + indexPatternName
 *
 * @param configTemplate - name of configTemplate to setup
 * @param indexPatternName - default index pattern configTemplate should be installed with
 * @param groups - list of groups to add to jobs being installed
 * @param prefix - prefix to be added to job name
 * @param headers
 */
export const setupMlJob = async ({
  configTemplate,
  indexPatternName = 'auditbeat-*',
  groups = ['siem'],
  prefix = '',
  headers = {},
}: MlSetupArgs): Promise<SetupMlResponse> => {
  try {
    const response = await fetch(`/api/ml/modules/setup/${configTemplate}`, {
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({
        prefix,
        groups,
        indexPatternName,
        startDatafeed: false,
        useDedicatedIndex: false,
      }),
      headers: {
        'kbn-system-api': 'true',
        'content-type': 'application/json',
        'kbn-xsrf': chrome.getXsrfToken(),
        ...headers,
      },
    });
    await throwIfNotOk(response);
    return await response.json();
  } catch (error) {
    // TODO: Toaster error when this happens instead of returning empty data
    return emptyMlResponse;
  }
};

/**
 * Starts the given dataFeedIds
 *
 * @param datafeedIds
 * @param headers
 */
export const startDatafeeds = async (
  datafeedIds: string[],
  headers: Record<string, string | undefined>
): Promise<StartDatafeedResponse> => {
  try {
    const response = await fetch('/api/ml/jobs/force_start_datafeeds', {
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({
        datafeedIds,
      }),
      headers: {
        'kbn-system-api': 'true',
        'content-type': 'application/json',
        'kbn-xsrf': chrome.getXsrfToken(),
        ...headers,
      },
    });
    await throwIfNotOk(response);
    return await response.json();
  } catch (error) {
    // TODO: Toaster error when this happens instead of returning empty data
    return emptyStartDatafeedResponse;
  }
};

/**
 * Stops the given dataFeedIds and sets the corresponding Job's jobState to closed
 *
 * @param datafeedIds
 * @param headers
 */
export const stopDatafeeds = async (
  datafeedIds: string[],
  headers: Record<string, string | undefined>
): Promise<[StopDatafeedResponse, CloseJobsResponse]> => {
  try {
    const stopDatafeedsResponse = await fetch('/api/ml/jobs/stop_datafeeds', {
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({
        datafeedIds,
      }),
      headers: {
        'kbn-system-api': 'true',
        'content-type': 'application/json',
        'kbn-xsrf': chrome.getXsrfToken(),
        ...headers,
      },
    });

    await throwIfNotOk(stopDatafeedsResponse);
    const stopDatafeedsResponseJson = await stopDatafeedsResponse.json();

    const datafeedPrefix = 'datafeed-';
    const closeJobsResponse = await fetch('/api/ml/jobs/close_jobs', {
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
        'kbn-xsrf': chrome.getXsrfToken(),
        ...headers,
      },
    });

    await throwIfNotOk(stopDatafeedsResponseJson);
    return [stopDatafeedsResponseJson, await closeJobsResponse.json()];
  } catch (error) {
    // TODO: Toaster error when this happens instead of returning empty data
    return emptyStopDatafeeds;
  }
};

/**
 * Fetches Job Details for given jobIds
 *
 * @param jobIds
 * @param headers
 */
export const jobsSummary = async (
  jobIds: string[],
  headers: Record<string, string | undefined>
): Promise<Job[]> => {
  try {
    const response = await fetch('/api/ml/jobs/jobs_summary', {
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ jobIds }),
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': chrome.getXsrfToken(),
        'kbn-system-api': 'true',
        ...headers,
      },
    });
    await throwIfNotOk(response);
    return await response.json();
  } catch (error) {
    // TODO: Toaster error when this happens instead of returning empty data
    return emptyJob;
  }
};
