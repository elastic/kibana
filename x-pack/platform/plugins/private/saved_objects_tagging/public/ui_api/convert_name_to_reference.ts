/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { ITagsCache } from '../services';
import { convertTagNameToId } from '../utils';

export interface BuildConvertNameToReferenceOptions {
  cache: ITagsCache;
}

export const buildConvertNameToReference = ({
  cache,
}: BuildConvertNameToReferenceOptions): SavedObjectsTaggingApiUi['convertNameToReference'] => {
  return (tagName: string) => {
    const tagId = convertTagNameToId(tagName, cache.getState());
    return tagId ? { type: 'tag', id: tagId } : undefined;
  };
};
