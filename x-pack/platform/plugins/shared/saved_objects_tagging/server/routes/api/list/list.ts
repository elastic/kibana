/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagAttributes } from '../../../../common/types';
import { tagSavedObjectTypeName } from '../../../../common/constants';
import type { TagsHandlerContext } from '../../../types';
import type { TagsListRequestQuery, TagsListResponseBody } from '../schemas';
import { getTagResponseItem } from '../get_tag_response_item';

export const list = async (
  requestContext: TagsHandlerContext,
  requestQuery: TagsListRequestQuery
): Promise<TagsListResponseBody> => {
  const { client } = (await requestContext.core).savedObjects;

  const { query, page, per_page: perPage } = requestQuery;
  const soResponse = await client.find<TagAttributes>({
    type: [tagSavedObjectTypeName],
    search: query,
    searchFields: ['name', 'description'],
    defaultSearchOperator: 'AND',
    page: page ?? 1,
    perPage: perPage ?? 20,
  });

  return {
    tags: soResponse.saved_objects.map(getTagResponseItem),
    total: soResponse.total,
    page: soResponse.page,
  };
};
