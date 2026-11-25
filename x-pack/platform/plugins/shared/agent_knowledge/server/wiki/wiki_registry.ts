/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PAGE_TYPE_PATTERN, WIKI_ID_PATTERN } from '../../common';
import type { WikiDefinition, WikiPageTypeDefinition } from '../types';
import { WikiError } from './wiki_error';

export interface WikiRegistry {
  register: (definition: WikiDefinition) => void;
  /** Throws a `WikiError` when the wiki or the page type was never registered. */
  resolve: (
    wikiId: string,
    pageType: string
  ) => { index: string; pageType: WikiPageTypeDefinition; pageTypeNames: string[] };
}

const assertValid = ({ id, index, pageTypes }: WikiDefinition): void => {
  if (!WIKI_ID_PATTERN.test(id)) {
    throw new Error(`Invalid wiki id "${id}"`);
  }
  if (index.trim() === '' || /[*,]/.test(index)) {
    throw new Error(`Wiki "${id}" needs one concrete index, got "${index}"`);
  }
  const types = Object.entries(pageTypes);
  if (types.length === 0) {
    throw new Error(`Wiki "${id}" registers no page type`);
  }
  for (const [type, { entriesHeading }] of types) {
    if (!PAGE_TYPE_PATTERN.test(type)) {
      throw new Error(`Wiki "${id}" has an invalid page type "${type}"`);
    }
    if (entriesHeading.trim() === '' || entriesHeading.includes('\n')) {
      throw new Error(`Page type "${type}" of wiki "${id}" needs a one-line entries heading`);
    }
  }
};

export const createWikiRegistry = (): WikiRegistry => {
  const wikis = new Map<string, WikiDefinition>();

  return {
    register(definition) {
      assertValid(definition);
      if (wikis.has(definition.id)) {
        throw new Error(`Wiki "${definition.id}" is already registered`);
      }
      wikis.set(definition.id, definition);
    },

    resolve(wikiId, pageType) {
      const wiki = wikis.get(wikiId);
      if (!wiki) {
        throw new WikiError('unknown_wiki', `No wiki is registered as "${wikiId}"`);
      }
      const type = Object.hasOwn(wiki.pageTypes, pageType) ? wiki.pageTypes[pageType] : undefined;
      if (!type) {
        throw new WikiError('unknown_page_type', `Wiki "${wikiId}" has no page type "${pageType}"`);
      }
      return { index: wiki.index, pageType: type, pageTypeNames: Object.keys(wiki.pageTypes) };
    },
  };
};
