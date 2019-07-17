/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { SlmPolicy, SlmPolicyPayload } from '../../../../common/types';
import { UIM_POLICY_CREATE } from '../../constants';
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

export const addPolicy = async (newPolicy: SlmPolicyPayload) => {
  return sendRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}policies`),
    method: 'put',
    body: newPolicy,
    uimActionType: UIM_POLICY_CREATE,
  });
};
