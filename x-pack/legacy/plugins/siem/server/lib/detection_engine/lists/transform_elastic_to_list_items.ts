/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Change this out for the definite types?
import { SearchResponse } from '../../types';
import { ListsItemsSchema } from '../routes/schemas/response/lists_items_schema';
import { ElasticListItemReturnType } from './types';
import { Type } from '../routes/schemas/common/schemas';

export const transformElasticToListsItems = ({
  response,
  type,
}: {
  response: SearchResponse<ElasticListItemReturnType>;
  type: Type;
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
      case 'keyword': {
        return {
          id: hit._id,
          created_at: hit._source.created_at,
          updated_at: hit._source.updated_at,
          list_id: hit._source.list_id,
          tie_breaker_id: hit._source.tie_breaker_id,
          type,
          value: hit._source.keyword ?? 'invalid value', // TODO: Something better here than empty string
        };
      }
    }
    // TypeScript is not happy unless I have this line here
    return assertUnreachable();
  });
};

export const assertUnreachable = (): never => {
  throw new Error('Unknown type in elastic_to_list_items');
};
