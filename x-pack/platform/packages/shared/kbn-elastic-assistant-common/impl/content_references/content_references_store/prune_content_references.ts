/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentReferences, ContentReference } from '../../schemas';
import { getContentReferenceId } from '../references/utils';
import { ContentReferencesStore, ContentReferenceBlock } from '../types';

/**
 * Returnes a pruned copy of the ContentReferencesStore.
 * @param content The content that may contain references to data within the ContentReferencesStore.
 * @param contentReferencesStore The ContentReferencesStore contain the contentReferences.
 * @returns a new record only containing the ContentReferences that are referenced to by the content.
 */
export const pruneContentReferences = (
  content: string,
  contentReferencesStore: ContentReferencesStore
): ContentReferences | undefined => {
  const fullStore = contentReferencesStore.getStore();
  const prunedStore: Record<string, ContentReference> = {};
  const matches = content.matchAll(/\{reference\([0-9a-zA-Z]+\)\}/g);
  let isPrunedStoreEmpty = true;

  for (const match of matches) {
    const referenceElement = match[0];
    const referenceId = getContentReferenceId(referenceElement as ContentReferenceBlock);
    if (!(referenceId in prunedStore)) {
      const contentReference = fullStore[referenceId];
      if (contentReference) {
        isPrunedStoreEmpty = false;
        prunedStore[referenceId] = contentReference;
      }
    }
  }

  if (isPrunedStoreEmpty) {
    return undefined;
  }

  return prunedStore;
};
