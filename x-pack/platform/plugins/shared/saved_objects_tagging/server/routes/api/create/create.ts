/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagAttributes } from '../../../../common/types';
import { getRandomColor } from '../../../../common';
import { tagSavedObjectTypeName } from '../../../../common/constants';
import type { TagsHandlerContext } from '../../../types';
import type { TagResponseItem } from '../schemas';
import { getTagResponseItem } from '../get_tag_response_item';

export const create = async (
  requestContext: TagsHandlerContext,
  createBody: { name: string; description?: string; color?: string }
): Promise<
  { outcome: 'created'; body: TagResponseItem } | { outcome: 'conflict'; message: string }
> => {
  const { tagsClient } = await requestContext.tags;
  const { client } = (await requestContext.core).savedObjects;

  const existingTag = await tagsClient.findByName(createBody.name, { exact: true });
  if (existingTag) {
    return {
      outcome: 'conflict',
      message: `A tag with the name "${createBody.name}" already exists.`,
    };
  }

  const tag = await tagsClient.create({
    name: createBody.name,
    description: createBody.description ?? '',
    color: createBody.color ?? getRandomColor(),
  });

  const savedObject = await client.get<TagAttributes>(tagSavedObjectTypeName, tag.id);

  return {
    outcome: 'created',
    body: getTagResponseItem(savedObject),
  };
};
