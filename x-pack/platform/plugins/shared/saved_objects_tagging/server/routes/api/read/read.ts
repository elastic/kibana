/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagResponseItem } from '../schemas';
import type { TagsHandlerContext } from '../../../types';
import type { TagAttributes } from '../../../../common/types';
import { tagSavedObjectTypeName } from '../../../../common/constants';
import { getTagResponseItem } from '../get_tag_response_item';

export const read = async (
  requestContext: TagsHandlerContext,
  id: string
): Promise<TagResponseItem> => {
  const { client } = (await requestContext.core).savedObjects;
  const savedObject = await client.get<TagAttributes>(tagSavedObjectTypeName, id);

  return getTagResponseItem(savedObject);
};
