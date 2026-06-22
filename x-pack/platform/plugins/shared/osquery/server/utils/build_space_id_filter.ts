/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

export const buildSpaceIdFilter = (spaceId?: string): Record<string, unknown> | undefined => {
  if (!spaceId) {
    return undefined;
  }

  if (spaceId === DEFAULT_SPACE_ID) {
    return {
      bool: {
        should: [
          { term: { space_id: DEFAULT_SPACE_ID } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
        ],
      },
    };
  }

  return { term: { space_id: spaceId } };
};
