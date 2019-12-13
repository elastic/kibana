/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_IDENTIFIER } from '../../../../common/constants';

export const updateTags = (prevTags: string[], nextTags: string[] | undefined | null): string[] => {
  if (nextTags == null) {
    return prevTags;
  } else {
    const allInternalStructures = prevTags.filter(tag => tag.startsWith(INTERNAL_IDENTIFIER));
    return [...allInternalStructures, ...nextTags];
  }
};
