/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UIM_POLICY_DELETE,
  UIM_POLICY_ATTACH_INDEX,
  UIM_POLICY_ATTACH_INDEX_TEMPLATE,
  UIM_POLICY_DETACH_INDEX,
  UIM_INDEX_RETRY_STEP,
} from '../constants';

import { trackUiMetric } from './ui_metric';
import { sendGet, sendPost, sendDelete } from './http';

// The extend_index_management module that we support an injected httpClient here.

export async function loadNodes(httpClient) {
  const response = await sendGet(`nodes/list`, httpClient);
  return response.data;
}

export async function loadNodeDetails(selectedNodeAttrs, httpClient) {
  const response = await sendGet(`nodes/${selectedNodeAttrs}/details`, httpClient);
  return response.data;
}

export async function loadIndexTemplates(httpClient) {
  const response = await sendGet(`templates`, httpClient);
  return response.data;
}

export async function loadIndexTemplate(templateName, httpClient) {
  if (!templateName) {
    return {};
  }
  const response = await sendGet(`templates/${templateName}`, httpClient);
  return response.data;
}

export async function loadPolicies(withIndices, httpClient) {
  const response = await sendGet(`policies${withIndices ? '?withIndices=true' : ''}`, httpClient);
  return response.data;
}

export async function savePolicy(policy, httpClient) {
  const response = await sendPost(`policies`, policy, httpClient);
  return response.data;
}

export async function deletePolicy(policyName, httpClient) {
  const response = await sendDelete(`policies/${encodeURIComponent(policyName)}`, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_DELETE);
  return response.data;
}

export const retryLifecycleForIndex = async (indexNames, httpClient) => {
  const response = await sendPost(`index/retry`, { indexNames }, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_INDEX_RETRY_STEP);
  return response.data;
};

export const removeLifecycleForIndex = async (indexNames, httpClient) => {
  const response = await sendPost(`index/remove`, { indexNames }, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_DETACH_INDEX);
  return response.data;
};

export const addLifecyclePolicyToIndex = async (body, httpClient) => {
  const response = await sendPost(`index/add`, body, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_ATTACH_INDEX);
  return response.data;
};

export const addLifecyclePolicyToTemplate = async (body, httpClient) => {
  const response = await sendPost(`template`, body, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_ATTACH_INDEX_TEMPLATE);
  return response.data;
};
