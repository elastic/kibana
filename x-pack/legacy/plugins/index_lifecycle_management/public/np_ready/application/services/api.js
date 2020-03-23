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
  return await sendGet(`nodes/list`, httpClient);
}

export async function loadNodeDetails(selectedNodeAttrs, httpClient) {
  return await sendGet(`nodes/${selectedNodeAttrs}/details`, httpClient);
}

export async function loadIndexTemplates(httpClient) {
  return await sendGet(`templates`, httpClient);
}

export async function loadIndexTemplate(templateName, httpClient) {
  if (!templateName) {
    return {};
  }
  return await sendGet(`templates/${templateName}`, httpClient);
}

export async function loadPolicies(withIndices, httpClient) {
  const query = withIndices ? '?withIndices=true' : '';
  return await sendGet('policies', query, httpClient);
}

export async function savePolicy(policy, httpClient) {
  return await sendPost(`policies`, policy, httpClient);
}

export async function deletePolicy(policyName, httpClient) {
  const response = await sendDelete(`policies/${encodeURIComponent(policyName)}`, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_DELETE);
  return response;
}

export const retryLifecycleForIndex = async (indexNames, httpClient) => {
  const response = await sendPost(`index/retry`, { indexNames }, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_INDEX_RETRY_STEP);
  return response;
};

export const removeLifecycleForIndex = async (indexNames, httpClient) => {
  const response = await sendPost(`index/remove`, { indexNames }, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_DETACH_INDEX);
  return response;
};

export const addLifecyclePolicyToIndex = async (body, httpClient) => {
  const response = await sendPost(`index/add`, body, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_ATTACH_INDEX);
  return response;
};

export const addLifecyclePolicyToTemplate = async (body, httpClient) => {
  const response = await sendPost(`template`, body, httpClient);
  // Only track successful actions.
  trackUiMetric('count', UIM_POLICY_ATTACH_INDEX_TEMPLATE);
  return response;
};
