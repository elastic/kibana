/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallWithRequest } from '../types';

export const getPolicyExists = async (
  callWithRequest: CallWithRequest<{ path: string; method: 'GET' }, {}, unknown>,
  policy: string
): Promise<boolean> => {
  try {
    await callWithRequest('transport.request', {
      path: `/_ilm/policy/${policy}`,
      method: 'GET',
    });
    // Return true that there exists a policy which is not 404 or some error
    // Since there is not a policy exists API, this is how we create one by calling
    // into the API to get it if it exists or rely on it to throw a 404
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      return false;
    } else {
      throw err;
    }
  }
};
