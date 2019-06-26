/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { Group, MlSetupArgs } from './types';

/**
 * Fetches ML Groups Data
 *
 * @param headers
 */
export const groupsData = async (headers: Record<string, string | undefined>): Promise<Group[]> => {
  const response = await fetch('/api/ml/jobs/groups', {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'kbn-system-api': 'true',
      'content-Type': 'application/json',
      'kbn-xsrf': chrome.getXsrfToken(),
      ...headers,
    },
  });
  return await response.json();
};

/**
 * Creates ML Jobs + Datafeeds for the given configTemplate + indexPatternName
 *
 * @param configTemplate
 * @param indexPatternName
 * @param groups
 */
export const setupMlJob = async ({
  configTemplate,
  indexPatternName = 'auditbeat-*',
  groups = ['siem'],
}: MlSetupArgs) => {
  const response = await fetch(`/api/ml/modules/setup/${configTemplate}`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      prefix: 'siem-api-test-',
      groups,
      indexPatternName,
      startDatafeed: false,
      useDedicatedIndex: false,
    }),
    headers: {
      'kbn-system-api': 'true',
      'Content-Type': 'application/json',
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });
  return await response.json();
};

/**
 * Starts the given dataFeedIds
 *
 * @param datafeedIds
 */
export const startDatafeeds = async (datafeedIds: string[]) => {
  const response = await fetch('/api/ml/jobs/force_start_datafeeds', {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      datafeedIds,
    }),
    headers: {
      'kbn-system-api': 'true',
      'Content-Type': 'application/json',
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });
  return await response.json();
};

/**
 * Stops the given dataFeedIds and sets the corresponding Job's jobState to closed
 *
 * TODO: Error Handling
 *
 * @param datafeedIds
 */
export const stopDatafeeds = async (datafeedIds: string[]) => {
  const stopDatafeedsResponse = await fetch('/api/ml/jobs/stop_datafeeds', {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      datafeedIds,
    }),
    headers: {
      'kbn-system-api': 'true',
      'Content-Type': 'application/json',
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });

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
      'kbn-system-api': 'true',
      'Content-Type': 'application/json',
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });

  return [stopDatafeedsResponseJson, await closeJobsResponse.json()];
};

/**
 * Fetches Job Details for given jobIds
 *
 * TODO: Remove after Frank's ML PR makes it in
 *
 * @param jobIds
 */
export const jobsSummary = async (jobIds: string[]) => {
  const response = await fetch(`/api/ml/anomaly_detectors/${jobIds.join(',')}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });
  return await response.json();
};
