/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let urlService;
import { BASE_PATH } from '../../common/constants';
export const setUrlService = aUrlService => {
  urlService = aUrlService;
};
export const getUrlService = () => {
  return urlService;
};

export const goToPolicyList = () => {
  urlService.change(`${BASE_PATH}policies`);
};

export const getPolicyPath = policyName => {
  return encodeURI(`#${BASE_PATH}policies/edit/${encodeURIComponent(policyName)}`);
};
