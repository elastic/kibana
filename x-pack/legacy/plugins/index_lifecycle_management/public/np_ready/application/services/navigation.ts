/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../../../../common/constants';

// This depends upon Angular, which is why we use this provider pattern to access it within
// our React app.
let _redirect: any;

export function init(redirect: any) {
  _redirect = redirect;
}

export const goToPolicyList = () => {
  _redirect(`${BASE_PATH}policies`);
};

export const getPolicyPath = (policyName: string): string => {
  return encodeURI(`#${BASE_PATH}policies/edit/${encodeURIComponent(policyName)}`);
};
