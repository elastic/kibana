/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BASE_PATH } from '../../../common/constants';

export const getIndexListUri = (filter: any) => {
  if (filter) {
    // React router tries to decode url params but it can't because the browser partially
    // decodes them. So we have to encode both the URL and the filter to get it all to
    // work correctly for filters with URL unsafe characters in them.
    return encodeURI(`#${BASE_PATH}indices/filter/${encodeURIComponent(filter)}`);
  }

  // If no filter, URI is already safe so no need to encode.
  return `#${BASE_PATH}indices`;
};

export const getILMPolicyPath = (policyName: string) => {
  return encodeURI(
    `#/management/elasticsearch/index_lifecycle_management/policies/edit/${encodeURIComponent(
      policyName
    )}`
  );
};
