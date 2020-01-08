/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallWithRequest } from '../types';

export const getIndexExists = async (
  callWithRequest: CallWithRequest<
    { index: string; size: number; terminate_after: number; allow_no_indices: boolean },
    {},
    unknown
  >,
  index: string
): Promise<boolean> => {
  try {
    callWithRequest('search', {
      index,
      size: 0,
      terminate_after: 1,
      allow_no_indices: true,
    });
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      return false;
    } else {
      throw err;
    }
  }
};
