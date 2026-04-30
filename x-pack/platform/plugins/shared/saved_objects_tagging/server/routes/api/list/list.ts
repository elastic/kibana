/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { TagAttributes } from '../../../../common/types';
import { tagSavedObjectTypeName } from '../../../../common/constants';
import type { TagsHandlerContext } from '../../../types';
import type { TagsListResponseBody } from '../schemas';
import { getTagResponseItem } from '../get_tag_response_item';

export const list = async (requestContext: TagsHandlerContext): Promise<TagsListResponseBody> => {
  const { client } = (await requestContext.core).savedObjects;
  const pitFinder = client.createPointInTimeFinder<TagAttributes>({
    type: tagSavedObjectTypeName,
    perPage: 1000,
  });

  const results: Array<SavedObject<TagAttributes>> = [];
  for await (const response of pitFinder.find()) {
    results.push(...response.saved_objects);
  }
  await pitFinder.close();

  const tags = results.map(getTagResponseItem);

  return {
    tags,
    total: tags.length,
    page: 1,
  };
};
