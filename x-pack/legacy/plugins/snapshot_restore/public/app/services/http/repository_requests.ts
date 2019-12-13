/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { Repository, EmptyRepository } from '../../../../common/types';
import {
  UIM_REPOSITORY_CREATE,
  UIM_REPOSITORY_UPDATE,
  UIM_REPOSITORY_DELETE,
  UIM_REPOSITORY_DELETE_MANY,
  UIM_REPOSITORY_DETAIL_PANEL_VERIFY,
  UIM_REPOSITORY_DETAIL_PANEL_CLEANUP,
} from '../../constants';
import { uiMetricService } from '../ui_metric';
import { httpService } from './http';
import { sendRequest, useRequest } from './use_request';

export const useLoadRepositories = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repositories`),
    method: 'get',
    initialData: [],
  });
};

export const useLoadRepository = (name: Repository['name']) => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repositories/${encodeURIComponent(name)}`),
    method: 'get',
  });
};

export const verifyRepository = async (name: Repository['name']) => {
  const result = await sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${encodeURIComponent(name)}/verify`
    ),
    method: 'get',
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_REPOSITORY_DETAIL_PANEL_VERIFY);
  return result;
};

export const cleanupRepository = async (name: Repository['name']) => {
  const result = await sendRequest({
    path: httpService.addBasePath(`_snapshot/${encodeURIComponent(name)}/_cleanup`),
    method: 'post',
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_REPOSITORY_DETAIL_PANEL_CLEANUP);
  return result;
};

export const useLoadRepositoryTypes = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repository_types`),
    method: 'get',
    initialData: [],
  });
};

export const addRepository = async (newRepository: Repository | EmptyRepository) => {
  const result = await sendRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}repositories`),
    method: 'put',
    body: newRepository,
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_REPOSITORY_CREATE);
  return result;
};

export const editRepository = async (editedRepository: Repository | EmptyRepository) => {
  const result = await sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${encodeURIComponent(editedRepository.name)}`
    ),
    method: 'put',
    body: editedRepository,
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_REPOSITORY_UPDATE);
  return result;
};

export const deleteRepositories = async (names: Array<Repository['name']>) => {
  const result = await sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}repositories/${names.map(name => encodeURIComponent(name)).join(',')}`
    ),
    method: 'delete',
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(names.length > 1 ? UIM_REPOSITORY_DELETE_MANY : UIM_REPOSITORY_DELETE);
  return result;
};
