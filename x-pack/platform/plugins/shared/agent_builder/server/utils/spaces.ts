/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export const isDefaultSpace = (space: string | undefined): boolean => {
  return !space || space === DEFAULT_SPACE_ID;
};

export const getCurrentSpaceId = ({
  spaces,
  request,
}: {
  request: KibanaRequest;
  spaces: SpacesPluginStart | undefined;
}): string => {
  return spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;
};

export const createSpaceDslFilter = (space: string): QueryDslQueryContainer => {
  return isDefaultSpace(space)
    ? {
        bool: {
          should: [{ term: { space } }, { bool: { must_not: { exists: { field: 'space' } } } }],
          minimum_should_match: 1,
        },
      }
    : {
        bool: {
          should: [{ term: { space } }],
          minimum_should_match: 1,
        },
      };
};
