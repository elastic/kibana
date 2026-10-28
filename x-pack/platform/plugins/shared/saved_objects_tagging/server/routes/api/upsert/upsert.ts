/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import { type SavedObject, SavedObjectsErrorHelpers } from '@kbn/core/server';
import Boom from '@hapi/boom';
import type { TagAttributes } from '../../../../common/types';
import { getRandomColor } from '../../../../common';
import { tagSavedObjectTypeName } from '../../../../common/constants';
import type { TagsHandlerContext } from '../../../types';
import { TagValidationError } from '../../../services/tags/errors';
import { validateTag } from '../../../services/tags/validate_tag';
import type { TagResponseItem } from '../schemas';
import { getTagResponseItem } from '../get_tag_response_item';

export const upsert = async (
  requestContext: TagsHandlerContext,
  id: string,
  upsertBody: { name: string; description?: string; color?: string }
): Promise<TagResponseItem> => {
  const { tagsClient } = await requestContext.tags;
  const { client } = (await requestContext.core).savedObjects;

  const existingTag = await tagsClient.findByName(upsertBody.name, { exact: true });
  if (existingTag && existingTag.id !== id) {
    throw SavedObjectsErrorHelpers.decorateConflictError(
      Boom.conflict(`A tag with the name "${upsertBody.name}" already exists.`)
    );
  }

  const attributes: TagAttributes = {
    name: upsertBody.name,
    description: upsertBody.description ?? '',
    color: upsertBody.color ?? getRandomColor(),
  };

  const validation = validateTag(attributes);
  if (!validation.valid) {
    throw new TagValidationError('Error validating tag attributes', validation);
  }

  let isCreateRequest = false;
  try {
    await client.resolve<TagAttributes>(tagSavedObjectTypeName, id);
  } catch (resolveError) {
    if (SavedObjectsErrorHelpers.isNotFoundError(resolveError as Error)) {
      isCreateRequest = true;
    } else {
      throw resolveError;
    }
  }

  if (isCreateRequest) {
    asCodeIdSchema.parse(id);
  }

  const savedObject = await client.update<TagAttributes>(tagSavedObjectTypeName, id, attributes, {
    upsert: attributes,
    mergeAttributes: false,
  });

  return getTagResponseItem(savedObject as SavedObject<TagAttributes>);
};
