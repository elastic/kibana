/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallWithRequest } from '../types';

export const getIndexExists = async (
  callWithRequest: CallWithRequest<
    { index: string; size: number; terminate_after: number; allow_no_indices: boolean },
    { _shards: { total: number } }
  >,
  index: string
): Promise<boolean> => {
  try {
    const response = await callWithRequest('search', {
      index,
      size: 0,
      terminate_after: 1,
      allow_no_indices: true,
    });
    return response._shards.total > 0;
  } catch (err) {
    if (err.status === 404) {
      return false;
    } else {
      throw err;
    }
  }
};
