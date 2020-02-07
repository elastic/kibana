/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { UIM_SNAPSHOT_DELETE, UIM_SNAPSHOT_DELETE_MANY } from '../../constants';
import { uiMetricService } from '../ui_metric';
import { httpService } from './http';
import { sendRequest, useRequest } from './use_request';

export const useLoadSnapshots = () =>
  useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}snapshots`),
    method: 'get',
    initialData: [],
  });

export const useLoadSnapshot = (repositoryName: string, snapshotId: string) =>
  useRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}snapshots/${encodeURIComponent(repositoryName)}/${encodeURIComponent(
        snapshotId
      )}`
    ),
    method: 'get',
  });

export const deleteSnapshots = async (
  snapshotIds: Array<{ snapshot: string; repository: string }>
) => {
  const result = await sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}snapshots/${snapshotIds
        .map(({ snapshot, repository }) => encodeURIComponent(`${repository}/${snapshot}`))
        .join(',')}`
    ),
    method: 'delete',
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(snapshotIds.length > 1 ? UIM_SNAPSHOT_DELETE_MANY : UIM_SNAPSHOT_DELETE);
  return result;
};
