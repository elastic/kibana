/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentReference } from '../../schemas';
import { ContentReferencesStore } from '../types';

const CONTENT_REFERENCE_ID_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Creates a new ContentReferencesStore used for storing references (also known as citations)
 */
export const newContentReferencesStore: () => ContentReferencesStore = () => {
  const store = new Map<string, ContentReference>();

  const add: ContentReferencesStore['add'] = (creator) => {
    const entry = creator({ id: generateUnsecureId() });
    store.set(entry.id, entry);
    return entry;
  };

  const getStore: ContentReferencesStore['getStore'] = () => {
    return Object.fromEntries(store);
  };

  /**
   * Generates an ID that does not exist in the store yet. This is not cryptographically secure.
   * @param size Size of ID to generate
   * @returns an unsecure Id
   */
  const generateUnsecureId = (size = 5): string => {
    let id = '';
    for (let i = 0; i < size; i++) {
      id += CONTENT_REFERENCE_ID_ALPHABET.charAt(
        Math.floor(Math.random() * CONTENT_REFERENCE_ID_ALPHABET.length)
      );
    }
    if (store.has(id)) {
      return generateUnsecureId(size + 1);
    }
    return id;
  };

  return {
    add,
    getStore,
  };
};
