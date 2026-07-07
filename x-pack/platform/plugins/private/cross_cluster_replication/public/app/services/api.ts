/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AutoFollowPattern, FollowerIndex } from '../../../common/types';
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
  UIM_AUTO_FOLLOW_PATTERN_PAUSE,
  UIM_AUTO_FOLLOW_PATTERN_PAUSE_MANY,
  UIM_AUTO_FOLLOW_PATTERN_RESUME,
  UIM_AUTO_FOLLOW_PATTERN_RESUME_MANY,
} from '../constants';
import { trackUserRequest } from './track_ui_metric';
import { areAllSettingsDefault } from './follower_index_default_settings';

export type AutoFollowPatternCreateConfig = Pick<
  AutoFollowPattern,
  'remoteCluster' | 'leaderIndexPatterns' | 'followIndexPattern'
>;
export type AutoFollowPatternConfig = AutoFollowPatternCreateConfig &
  Pick<AutoFollowPattern, 'active'>;

export interface CreateAutoFollowPatternRequest extends AutoFollowPatternCreateConfig {
  id: string;
}

export interface BulkIdError {
  id: string;
}

export interface DeleteAutoFollowPatternResponse {
  errors: BulkIdError[];
  itemsDeleted: string[];
}

export interface PauseAutoFollowPatternResponse {
  errors: BulkIdError[];
  itemsPaused: string[];
}

export interface ResumeAutoFollowPatternResponse {
  errors: BulkIdError[];
  itemsResumed: string[];
}

export interface RemoteClusterRow {
  name: string;
  isConnected: boolean;
}

export type FollowerIndexSaveBody = Omit<FollowerIndex, 'name' | 'status' | 'shards'>;

export interface PauseFollowerIndexResponse {
  errors: BulkIdError[];
  itemsPaused: string[];
}

export interface ResumeFollowerIndexResponse {
  errors: BulkIdError[];
  itemsResumed: string[];
}

export interface UnfollowLeaderIndexResponse {
  errors: BulkIdError[];
  itemsUnfollowed: string[];
  itemsNotOpen: string[];
}

let httpClient: HttpSetup;

export function setHttpClient(client: HttpSetup): void {
  httpClient = client;
}

export const getHttpClient = (): HttpSetup => {
  return httpClient;
};

// ---

const createIdString = (ids: string[]): string => ids.map((id) => encodeURIComponent(id)).join(',');

/* Auto Follow Pattern */
export const loadAutoFollowPatterns = (
  asSystemRequest: boolean
): Promise<{ patterns: AutoFollowPattern[] }> =>
  httpClient.get<{ patterns: AutoFollowPattern[] }>(`${API_BASE_PATH}/auto_follow_patterns`, {
    asSystemRequest,
  });

export const getAutoFollowPattern = (id: string): Promise<AutoFollowPattern> =>
  httpClient.get<AutoFollowPattern>(
    `${API_BASE_PATH}/auto_follow_patterns/${encodeURIComponent(id)}`
  );

export const loadRemoteClusters = (): Promise<RemoteClusterRow[]> =>
  httpClient.get<RemoteClusterRow[]>(API_REMOTE_CLUSTERS_BASE_PATH);

export const createAutoFollowPattern = async (
  autoFollowPattern: CreateAutoFollowPatternRequest
): Promise<void> => {
  const request = httpClient.post<void>(`${API_BASE_PATH}/auto_follow_patterns`, {
    body: JSON.stringify(autoFollowPattern),
  });
  await trackUserRequest(request, UIM_AUTO_FOLLOW_PATTERN_CREATE);
};

export const updateAutoFollowPattern = async (
  id: string,
  autoFollowPattern: AutoFollowPatternConfig
): Promise<void> => {
  const request = httpClient.put<void>(
    `${API_BASE_PATH}/auto_follow_patterns/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(autoFollowPattern),
    }
  );
  await trackUserRequest(request, UIM_AUTO_FOLLOW_PATTERN_UPDATE);
};

export const deleteAutoFollowPattern = (
  id: string | string[]
): Promise<DeleteAutoFollowPatternResponse> => {
  const ids = arrify(id);
  const idString = ids.map((_id) => encodeURIComponent(_id)).join(',');
  const request = httpClient.delete<DeleteAutoFollowPatternResponse>(
    `${API_BASE_PATH}/auto_follow_patterns/${idString}`
  );
  const uiMetric =
    ids.length > 1 ? UIM_AUTO_FOLLOW_PATTERN_DELETE_MANY : UIM_AUTO_FOLLOW_PATTERN_DELETE;
  return trackUserRequest(request, uiMetric);
};

export const pauseAutoFollowPattern = (
  id: string | string[]
): Promise<PauseAutoFollowPatternResponse> => {
  const ids = arrify(id);
  const idString = ids.map(encodeURIComponent).join(',');
  const request = httpClient.post<PauseAutoFollowPatternResponse>(
    `${API_BASE_PATH}/auto_follow_patterns/${idString}/pause`
  );

  const uiMetric =
    ids.length > 1 ? UIM_AUTO_FOLLOW_PATTERN_PAUSE_MANY : UIM_AUTO_FOLLOW_PATTERN_PAUSE;
  return trackUserRequest(request, uiMetric);
};

export const resumeAutoFollowPattern = (
  id: string | string[]
): Promise<ResumeAutoFollowPatternResponse> => {
  const ids = arrify(id);
  const idString = ids.map(encodeURIComponent).join(',');
  const request = httpClient.post<ResumeAutoFollowPatternResponse>(
    `${API_BASE_PATH}/auto_follow_patterns/${idString}/resume`
  );

  const uiMetric =
    ids.length > 1 ? UIM_AUTO_FOLLOW_PATTERN_RESUME_MANY : UIM_AUTO_FOLLOW_PATTERN_RESUME;
  return trackUserRequest(request, uiMetric);
};

/* Follower Index */
export const loadFollowerIndices = (
  asSystemRequest: boolean
): Promise<{ indices: FollowerIndex[] }> =>
  httpClient.get<{ indices: FollowerIndex[] }>(`${API_BASE_PATH}/follower_indices`, {
    asSystemRequest,
  });

export const getFollowerIndex = (id: string): Promise<FollowerIndex> =>
  httpClient.get<FollowerIndex>(`${API_BASE_PATH}/follower_indices/${encodeURIComponent(id)}`);

export const createFollowerIndex = async (
  followerIndex: FollowerIndexSaveBody & { name: string }
): Promise<void> => {
  const uiMetrics = [UIM_FOLLOWER_INDEX_CREATE];
  const isUsingAdvancedSettings = !areAllSettingsDefault(followerIndex);
  if (isUsingAdvancedSettings) {
    uiMetrics.push(UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS);
  }
  const request = httpClient.post<void>(`${API_BASE_PATH}/follower_indices`, {
    body: JSON.stringify(followerIndex),
  });
  await trackUserRequest(request, uiMetrics);
};

export const pauseFollowerIndex = (id: string | string[]): Promise<PauseFollowerIndexResponse> => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put<PauseFollowerIndexResponse>(
    `${API_BASE_PATH}/follower_indices/${idString}/pause`
  );
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_PAUSE_MANY : UIM_FOLLOWER_INDEX_PAUSE;
  return trackUserRequest(request, uiMetric);
};

export const resumeFollowerIndex = (
  id: string | string[]
): Promise<ResumeFollowerIndexResponse> => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put<ResumeFollowerIndexResponse>(
    `${API_BASE_PATH}/follower_indices/${idString}/resume`
  );
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_RESUME_MANY : UIM_FOLLOWER_INDEX_RESUME;
  return trackUserRequest(request, uiMetric);
};

export const unfollowLeaderIndex = (
  id: string | string[]
): Promise<UnfollowLeaderIndexResponse> => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put<UnfollowLeaderIndexResponse>(
    `${API_BASE_PATH}/follower_indices/${idString}/unfollow`
  );
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_UNFOLLOW_MANY : UIM_FOLLOWER_INDEX_UNFOLLOW;
  return trackUserRequest(request, uiMetric);
};

export const updateFollowerIndex = async (
  id: string,
  followerIndex: FollowerIndexSaveBody
): Promise<void> => {
  const uiMetrics = [UIM_FOLLOWER_INDEX_UPDATE];
  const isUsingAdvancedSettings = !areAllSettingsDefault(followerIndex);
  if (isUsingAdvancedSettings) {
    uiMetrics.push(UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS);
  }

  const {
    maxReadRequestOperationCount,
    maxOutstandingReadRequests,
    maxReadRequestSize,
    maxWriteRequestOperationCount,
    maxWriteRequestSize,
    maxOutstandingWriteRequests,
    maxWriteBufferCount,
    maxWriteBufferSize,
    maxRetryDelay,
    readPollTimeout,
  } = followerIndex;

  const request = httpClient.put<void>(
    `${API_BASE_PATH}/follower_indices/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify({
        maxReadRequestOperationCount,
        maxOutstandingReadRequests,
        maxReadRequestSize,
        maxWriteRequestOperationCount,
        maxWriteRequestSize,
        maxOutstandingWriteRequests,
        maxWriteBufferCount,
        maxWriteBufferSize,
        maxRetryDelay,
        readPollTimeout,
      }),
    }
  );

  await trackUserRequest(request, uiMetrics);
};

/* Stats */
export const loadAutoFollowStats = () => httpClient.get(`${API_BASE_PATH}/stats/auto_follow`);

/* Indices */
let abortController: AbortController | null = null;
export const loadIndices = async (): Promise<Array<{ name: string }>> => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  abortController = new AbortController();
  const { signal } = abortController;
  const response = await httpClient.get<Array<{ name: string }>>(
    `${API_INDEX_MANAGEMENT_BASE_PATH}/indices`,
    { signal }
  );
  abortController = null;
  return response;
};

export const loadPermissions = (): Promise<{
  hasPermission: boolean;
  missingClusterPrivileges: string[];
}> => httpClient.get(`${API_BASE_PATH}/permissions`);
