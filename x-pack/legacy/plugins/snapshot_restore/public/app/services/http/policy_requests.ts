/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { SlmPolicy, SlmPolicyPayload } from '../../../../common/types';
import {
  UIM_POLICY_EXECUTE,
  UIM_POLICY_DELETE,
  UIM_POLICY_DELETE_MANY,
  UIM_POLICY_CREATE,
  UIM_POLICY_UPDATE,
  UIM_RETENTION_SETTINGS_UPDATE,
  UIM_RETENTION_EXECUTE,
} from '../../constants';
import { uiMetricService } from '../ui_metric';
import { httpService } from './http';
import { useRequest, sendRequest } from './use_request';

export const useLoadPolicies = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policies`),
    method: 'get',
  });
};

export const useLoadPolicy = (name: SlmPolicy['name']) => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policy/${encodeURIComponent(name)}`),
    method: 'get',
  });
};

export const useLoadIndices = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policies/indices`),
    method: 'get',
  });
};

export const executePolicy = async (name: SlmPolicy['name']) => {
  const result = sendRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policy/${encodeURIComponent(name)}/run`),
    method: 'post',
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_POLICY_EXECUTE);
  return result;
};

export const deletePolicies = async (names: Array<SlmPolicy['name']>) => {
  const result = sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}policies/${names.map(name => encodeURIComponent(name)).join(',')}`
    ),
    method: 'delete',
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(names.length > 1 ? UIM_POLICY_DELETE_MANY : UIM_POLICY_DELETE);
  return result;
};

export const addPolicy = async (newPolicy: SlmPolicyPayload) => {
  const result = sendRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policies`),
    method: 'put',
    body: newPolicy,
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_POLICY_CREATE);
  return result;
};

export const editPolicy = async (editedPolicy: SlmPolicyPayload) => {
  const result = await sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}policies/${encodeURIComponent(editedPolicy.name)}`
    ),
    method: 'put',
    body: editedPolicy,
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_POLICY_UPDATE);
  return result;
};

export const useLoadRetentionSettings = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policies/retention_settings`),
    method: 'get',
  });
};

export const updateRetentionSchedule = (retentionSchedule: string) => {
  const result = sendRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policies/retention_settings`),
    method: 'put',
    body: {
      retentionSchedule,
    },
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_RETENTION_SETTINGS_UPDATE);
  return result;
};

export const executeRetention = async () => {
  const result = sendRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policies/retention`),
    method: 'post',
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_RETENTION_EXECUTE);
  return result;
};
