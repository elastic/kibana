/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { some } from 'lodash';

export const allowResponse = (url: string, allowList: string[], denyList: string[]) => {
  const match = (pattern: string) => url.startsWith(pattern);

  // If an exact match is allowed, don't check the deny-list
  if (some(allowList, pattern => url === pattern)) {
    return true;
  }

  return (!allowList.length || some(allowList, match)) && !some(denyList, match);
};
