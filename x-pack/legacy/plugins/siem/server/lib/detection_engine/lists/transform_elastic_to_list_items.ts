/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Change this out for the definite types?
import { SearchResponse } from '../../types';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { ElasticReturnType } from './types';

export const transformElasticToListsItems = ({
  response,
  type,
}: {
  response: SearchResponse<ElasticReturnType>;
  type: string; // TODO Change this to an enum
}): ListsItemsSchema[] => {
  return response.hits.hits.map(hit => {
    switch (type) {
      case 'ip': {
        return {
          id: hit._id,
          created_at: hit._source.created_at,
          updated_at: hit._source.updated_at,
          list_id: hit._source.list_id,
          tie_breaker_id: hit._source.tie_breaker_id,
          type,
          value: hit._source.ip ?? '', // TODO: Something better here than empty string
        };
      }
      case 'string': {
        return {
          id: hit._id,
          created_at: hit._source.created_at,
          updated_at: hit._source.updated_at,
          list_id: hit._source.list_id,
          tie_breaker_id: hit._source.tie_breaker_id,
          type,
          value: hit._source.string ?? 'invalid value', // TODO: Something better here than empty string
        };
      }
      default: {
        // TODO: Once we use an enum this should go away
        throw new Error('Default should not be reached');
      }
    }
  });
};
