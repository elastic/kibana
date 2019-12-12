/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup, SavedObjectsClientContract } from 'src/core/public';
import { Settings } from 'plugins/watcher/np_ready/application/models/settings';
import { Watch } from 'plugins/watcher/np_ready/application/models/watch';
import { WatchHistoryItem } from 'plugins/watcher/np_ready/application/models/watch_history_item';
import { WatchStatus } from 'plugins/watcher/np_ready/application/models/watch_status';

import { BaseWatch, ExecutedWatchDetails } from '../../../../common/types/watch_types';
import { useRequest, sendRequest } from './use_request';

import { ROUTES } from '../../../../common/constants';

let httpClient: HttpSetup;

export const setHttpClient = (anHttpClient: HttpSetup) => {
  httpClient = anHttpClient;
};

export const getHttpClient = () => {
  return httpClient;
};

let savedObjectsClient: SavedObjectsClientContract;

export const setSavedObjectsClient = (aSavedObjectsClient: SavedObjectsClientContract) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => savedObjectsClient;

const basePath = ROUTES.API_ROOT;

export const useLoadWatches = (pollIntervalMs: number) => {
  return useRequest({
    path: `${basePath}/watches`,
    method: 'get',
    pollIntervalMs,
    deserializer: ({ watches = [] }: { watches: any[] }) => {
      return watches.map((watch: any) => Watch.fromUpstreamJson(watch));
    },
  });
};

export const useLoadWatchDetail = (id: string) => {
  return useRequest({
    path: `${basePath}/watch/${id}`,
    method: 'get',
    deserializer: ({ watch = {} }: { watch: any }) => Watch.fromUpstreamJson(watch),
  });
};

export const useLoadWatchHistory = (id: string, startTime: string) => {
  return useRequest({
    query: startTime ? { startTime } : undefined,
    path: `${basePath}/watch/${id}/history`,
    method: 'get',
    deserializer: ({ watchHistoryItems = [] }: { watchHistoryItems: any }) => {
      return watchHistoryItems.map((historyItem: any) =>
        WatchHistoryItem.fromUpstreamJson(historyItem)
      );
    },
  });
};

export const useLoadWatchHistoryDetail = (id: string | undefined) => {
  return useRequest({
    path: !id ? '' : `${basePath}/history/${id}`,
    method: 'get',
    deserializer: ({ watchHistoryItem }: { watchHistoryItem: any }) =>
      WatchHistoryItem.fromUpstreamJson(watchHistoryItem),
  });
};

export const deleteWatches = async (watchIds: string[]) => {
  const body = JSON.stringify({
    watchIds,
  });
  const { results } = await getHttpClient().post(`${basePath}/watches/delete`, { body });
  return results;
};

export const deactivateWatch = async (id: string) => {
  return sendRequest({
    path: `${basePath}/watch/${id}/deactivate`,
    method: 'put',
  });
};

export const activateWatch = async (id: string) => {
  return sendRequest({
    path: `${basePath}/watch/${id}/activate`,
    method: 'put',
  });
};

export const loadWatch = async (id: string) => {
  const { watch } = await getHttpClient().get(`${basePath}/watch/${id}`);
  return Watch.fromUpstreamJson(watch);
};

export const getMatchingIndices = async (pattern: string) => {
  if (!pattern.startsWith('*')) {
    pattern = `*${pattern}`;
  }
  if (!pattern.endsWith('*')) {
    pattern = `${pattern}*`;
  }
  const body = JSON.stringify({ pattern });
  const { indices } = await getHttpClient().post(`${basePath}/indices`, { body });
  return indices;
};

export const fetchFields = async (indexes: string[]) => {
  const { fields } = await getHttpClient().post(`${basePath}/fields`, {
    body: JSON.stringify({ indexes }),
  });
  return fields;
};

export const createWatch = async (watch: BaseWatch) => {
  return await getHttpClient().put(`${basePath}/watch/${watch.id}`, {
    body: JSON.stringify(watch.upstreamJson),
  });
};

export const executeWatch = async (executeWatchDetails: ExecutedWatchDetails, watch: BaseWatch) => {
  return sendRequest({
    path: `${basePath}/watch/execute`,
    method: 'put',
    body: JSON.stringify({
      executeDetails: executeWatchDetails.upstreamJson,
      watch: watch.upstreamJson,
    }),
  });
};

export const loadIndexPatterns = async () => {
  const { savedObjects } = await getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });
  return savedObjects;
};

export const useGetWatchVisualizationData = (watchModel: BaseWatch, visualizeOptions: any) => {
  return useRequest({
    path: `${basePath}/watch/visualize`,
    method: 'post',
    body: JSON.stringify({
      watch: watchModel.upstreamJson,
      options: visualizeOptions.upstreamJson,
    }),
    deserializer: ({ visualizeData }: { visualizeData: any }) => visualizeData,
  });
};

export const useLoadSettings = () => {
  return useRequest({
    path: `${basePath}/settings`,
    method: 'get',
    deserializer: (data: {
      action_types: {
        [key: string]: {
          enabled: boolean;
        };
      };
    }) => Settings.fromUpstreamJson(data),
  });
};

export const ackWatchAction = async (watchId: string, actionId: string) => {
  const { watchStatus } = await getHttpClient().put(
    `${basePath}/watch/${watchId}/action/${actionId}/acknowledge`
  );
  return WatchStatus.fromUpstreamJson(watchStatus);
};
