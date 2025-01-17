/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentReference, ContentReferences } from '../../schemas';
import { getContentReferenceId } from '../references/utils';
import { ContentReferenceBlock, ContentReferencesStore } from '../types';

const CONTENT_REFERENCE_ID_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Creates a new ContentReferencesStore used for storing references (also known as citations)
 */
export const contentReferencesStoreFactory: () => ContentReferencesStore = () => {
  const store = new Map<string, ContentReference>();

  const add: ContentReferencesStore['add'] = (creator) => {
    const entry = creator({ id: generateId() });
    store.set(entry.id, entry);
    return entry;
  };

  const getStore: ContentReferencesStore['getStore'] = () => {
    return Object.fromEntries(store);
  };

  /**
   * Generates an ID that does not exist in the store yet. This is not cryptographically secure.
   * @param size Size of ID to generate
   * @returns
   */
  const generateId = (size = 5): string => {
    let id = '';
    for (let i = 0; i < size; i++) {
      id += CONTENT_REFERENCE_ID_ALPHABET.charAt(
        Math.floor(Math.random() * CONTENT_REFERENCE_ID_ALPHABET.length)
      );
    }
    if (store.has(id)) {
      return generateId(size + 1);
    }
    return id;
  };

  return {
    add,
    getStore,
  };
};

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
