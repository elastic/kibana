/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  API_BASE_PATH,
  API_REMOTE_CLUSTERS_BASE_PATH,
  API_INDEX_MANAGEMENT_BASE_PATH,
} from '../../../common/constants';
import { arrify } from '../../../common/services/utils';
import {
  UIM_FOLLOWER_INDEX_CREATE,
  UIM_FOLLOWER_INDEX_UPDATE,
  UIM_FOLLOWER_INDEX_PAUSE,
  UIM_FOLLOWER_INDEX_PAUSE_MANY,
  UIM_FOLLOWER_INDEX_RESUME,
  UIM_FOLLOWER_INDEX_RESUME_MANY,
  UIM_FOLLOWER_INDEX_UNFOLLOW,
  UIM_FOLLOWER_INDEX_UNFOLLOW_MANY,
  UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS,
  UIM_AUTO_FOLLOW_PATTERN_CREATE,
  UIM_AUTO_FOLLOW_PATTERN_UPDATE,
  UIM_AUTO_FOLLOW_PATTERN_DELETE,
  UIM_AUTO_FOLLOW_PATTERN_DELETE_MANY,
} from '../constants';
import { trackUserRequest } from './track_ui_metric';
import { areAllSettingsDefault } from './follower_index_default_settings';

const apiPrefix = chrome.addBasePath(API_BASE_PATH);
const apiPrefixRemoteClusters = chrome.addBasePath(API_REMOTE_CLUSTERS_BASE_PATH);
const apiPrefixIndexManagement = chrome.addBasePath(API_INDEX_MANAGEMENT_BASE_PATH);

// This is an Angular service, which is why we use this provider pattern
// to access it within our React app.
let httpClient;

// The deferred AngularJS api allows us to create a deferred promise
// to be resolved later. This allows us to cancel in-flight http Requests.
// https://docs.angularjs.org/api/ng/service/$q#the-deferred-api
let $q;

export function setHttpClient(client, $deffered) {
  httpClient = client;
  $q = $deffered;
}

export const getHttpClient = () => {
  return httpClient;
};

// ---

const extractData = (response) => response.data;

const createIdString = (ids) => ids.map(id => encodeURIComponent(id)).join(',');

/* Auto Follow Pattern */
export const loadAutoFollowPatterns = () => (
  httpClient.get(`${apiPrefix}/auto_follow_patterns`).then(extractData)
);

export const getAutoFollowPattern = (id) => (
  httpClient.get(`${apiPrefix}/auto_follow_patterns/${encodeURIComponent(id)}`).then(extractData)
);

export const loadRemoteClusters = () => (
  httpClient.get(apiPrefixRemoteClusters).then(extractData)
);

export const createAutoFollowPattern = (autoFollowPattern) => {
  const request = httpClient.post(`${apiPrefix}/auto_follow_patterns`, autoFollowPattern);
  return trackUserRequest(request, UIM_AUTO_FOLLOW_PATTERN_CREATE).then(extractData);
};

export const updateAutoFollowPattern = (id, autoFollowPattern) => {
  const request = httpClient.put(`${apiPrefix}/auto_follow_patterns/${encodeURIComponent(id)}`, autoFollowPattern);
  return trackUserRequest(request, UIM_AUTO_FOLLOW_PATTERN_UPDATE).then(extractData);
};

export const deleteAutoFollowPattern = (id) => {
  const ids = arrify(id);
  const idString = ids.map(_id => encodeURIComponent(_id)).join(',');
  const request = httpClient.delete(`${apiPrefix}/auto_follow_patterns/${idString}`);
  const uiMetric = ids.length > 1 ? UIM_AUTO_FOLLOW_PATTERN_DELETE_MANY : UIM_AUTO_FOLLOW_PATTERN_DELETE;
  return trackUserRequest(request, uiMetric).then(extractData);
};

/* Follower Index */
export const loadFollowerIndices = () => (
  httpClient.get(`${apiPrefix}/follower_indices`).then(extractData)
);

export const getFollowerIndex = (id) => (
  httpClient.get(`${apiPrefix}/follower_indices/${encodeURIComponent(id)}`).then(extractData)
);

export const createFollowerIndex = (followerIndex) => {
  const uiMetrics = [UIM_FOLLOWER_INDEX_CREATE];
  const isUsingAdvancedSettings = !areAllSettingsDefault(followerIndex);
  if (isUsingAdvancedSettings) {
    uiMetrics.push(UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS);
  }
  const request = httpClient.post(`${apiPrefix}/follower_indices`, followerIndex);
  return trackUserRequest(request, uiMetrics).then(extractData);
};

export const pauseFollowerIndex = (id) => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put(`${apiPrefix}/follower_indices/${idString}/pause`);
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_PAUSE_MANY : UIM_FOLLOWER_INDEX_PAUSE;
  return trackUserRequest(request, uiMetric).then(extractData);
};

export const resumeFollowerIndex = (id) => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put(`${apiPrefix}/follower_indices/${idString}/resume`);
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_RESUME_MANY : UIM_FOLLOWER_INDEX_RESUME;
  return trackUserRequest(request, uiMetric).then(extractData);
};

export const unfollowLeaderIndex = (id) => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put(`${apiPrefix}/follower_indices/${idString}/unfollow`);
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_UNFOLLOW_MANY : UIM_FOLLOWER_INDEX_UNFOLLOW;
  return trackUserRequest(request, uiMetric).then(extractData);
};

export const updateFollowerIndex = (id, followerIndex) => {
  const uiMetrics = [UIM_FOLLOWER_INDEX_UPDATE];
  const isUsingAdvancedSettings = !areAllSettingsDefault(followerIndex);
  if (isUsingAdvancedSettings) {
    uiMetrics.push(UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS);
  }
  const request = httpClient.put(`${apiPrefix}/follower_indices/${encodeURIComponent(id)}`, followerIndex);
  return trackUserRequest(request, uiMetrics).then(extractData);
};

/* Stats */
export const loadAutoFollowStats = () => (
  httpClient.get(`${apiPrefix}/stats/auto_follow`).then(extractData)
);

/* Indices */
let canceler = null;
export const loadIndices = () => {
  if (canceler) {
    // If there is a previous request in flight we cancel it by resolving the canceler
    canceler.resolve();
  }
  canceler = $q.defer();
  return httpClient.get(`${apiPrefixIndexManagement}/indices`, { timeout: canceler.promise })
    .then((response) => {
      canceler = null;
      return extractData(response);
    });
};

export const loadPermissions = () => (
  httpClient.get(`${apiPrefix}/permissions`).then(extractData)
);
