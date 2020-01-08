/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallWithRequest } from '../types';

export const deletePolicy = async (
  callWithRequest: CallWithRequest<{ path: string; method: 'DELETE' }, {}, unknown>,
  policy: string
): Promise<unknown> => {
  return callWithRequest('transport.request', {
    path: `_ilm/policy/${policy}`,
    method: 'DELETE',
  });
};
