/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  CloseJobsResponse,
  Group,
  IndexPatternResponse,
  IndexPatternSavedObject,
  Job,
  MlSetupArgs,
  SetupMlResponse,
  StartDatafeedResponse,
  StopDatafeedResponse,
} from './types';
import {
  throwIfNotOk,
  throwIfErrorAttached,
  throwIfErrorAttachedToSetup,
} from '../ml/api/throw_if_not_ok';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../common/constants';

const emptyIndexPattern: IndexPatternSavedObject[] = [];

/**
 * Fetches ML Groups Data
 *
 * @param headers
 */
export const groupsData = async (
  headers: Record<string, string | undefined>,
  signal: AbortSignal
): Promise<Group[]> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const response = await fetch(`${chrome.getBasePath()}/api/ml/jobs/groups`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-xsrf': kbnVersion,
      ...headers,
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
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
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
      'kbn-system-api': 'true',
      'content-type': 'application/json',
      'kbn-xsrf': kbnVersion,
      ...headers,
    },
  });
  await throwIfNotOk(response);
  const json = await response.json();
  throwIfErrorAttachedToSetup(json);
  return json;
};

/**
 * Starts the given dataFeedIds
 *
 * @param datafeedIds
 * @param start
 * @param headers
 */
export const startDatafeeds = async (
  datafeedIds: string[],
  headers: Record<string, string | undefined>,
  start = 0
): Promise<StartDatafeedResponse> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const response = await fetch(`${chrome.getBasePath()}/api/ml/jobs/force_start_datafeeds`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      datafeedIds,
      ...(start !== 0 && { start }),
    }),
    headers: {
      'kbn-system-api': 'true',
      'content-type': 'application/json',
      'kbn-xsrf': kbnVersion,
      ...headers,
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
 * @param headers
 */
export const stopDatafeeds = async (
  datafeedIds: string[],
  headers: Record<string, string | undefined>
): Promise<[StopDatafeedResponse, CloseJobsResponse]> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const stopDatafeedsResponse = await fetch(`${chrome.getBasePath()}/api/ml/jobs/stop_datafeeds`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      datafeedIds,
    }),
    headers: {
      'kbn-system-api': 'true',
      'content-type': 'application/json',
      'kbn-xsrf': kbnVersion,
      ...headers,
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
      'kbn-xsrf': kbnVersion,
      ...headers,
    },
  });

  await throwIfNotOk(closeJobsResponse);
  return [stopDatafeedsResponseJson, await closeJobsResponse.json()];
};

/**
 * Fetches Job Details for given jobIds
 *
 * @param jobIds
 * @param headers
 */
export const jobsSummary = async (
  jobIds: string[],
  headers: Record<string, string | undefined>,
  signal: AbortSignal
): Promise<Job[]> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const response = await fetch(`${chrome.getBasePath()}/api/ml/jobs/jobs_summary`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({ jobIds }),
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': kbnVersion,
      'kbn-system-api': 'true',
      ...headers,
    },
    signal,
  });
  await throwIfNotOk(response);
  return response.json();
};

/**
 * Fetches Configured Index Patterns from the Kibana saved objects API (as ML does during create job flow)
 * TODO: Used by more than just ML now -- refactor to shared component https://github.com/elastic/siem-team/issues/448
 * @param headers
 */
export const getIndexPatterns = async (
  headers: Record<string, string | undefined>,
  signal: AbortSignal
): Promise<IndexPatternSavedObject[]> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const response = await fetch(
    `${chrome.getBasePath()}/api/saved_objects/_find?type=index-pattern&fields=title&fields=type&per_page=10000`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': kbnVersion,
        'kbn-system-api': 'true',
        ...headers,
      },
      signal,
    }
  );
  await throwIfNotOk(response);
  const results: IndexPatternResponse = await response.json();

  if (results.saved_objects && Array.isArray(results.saved_objects)) {
    return results.saved_objects;
  } else {
    return emptyIndexPattern;
  }
};
