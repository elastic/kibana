/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagsHandlerContext } from '../../../types';

export const deleteTag = async (requestContext: TagsHandlerContext, id: string): Promise<void> => {
  const { tagsClient } = await requestContext.tags;
  await tagsClient.delete(id);
};
