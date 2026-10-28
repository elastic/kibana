/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Query param that opens a collection's flyout on the integrations browse page.
export const COLLECTION_QUERYPARAM = 'collection';

export interface CollectionMember {
  name: string;
  title: string;
}

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

// Same semantics as the local search index: every query token must prefix a token of the text.
const matchesAllTokens = (queryTokens: string[], text: string): boolean => {
  const textTokens = tokenize(text);
  return queryTokens.every((q) => textTokens.some((t) => t.startsWith(q)));
};

/**
 * The members of a collection a search term is about, so a result can explain why it showed up.
 * Returns an empty list when the term is about the collection itself (the generic result fits)
 * or when no member matches.
 */
export const getMatchingCollectionMembers = (
  collection: CollectionMember,
  members: CollectionMember[],
  searchTerm?: string
): CollectionMember[] => {
  const queryTokens = tokenize(searchTerm ?? '');
  if (queryTokens.length === 0 || members.length === 0) {
    return [];
  }

  // The term is about the collection itself ("aws", "amazon").
  if (matchesAllTokens(queryTokens, `${collection.title} ${collection.name}`)) {
    return [];
  }

  return members.filter(
    (member) =>
      matchesAllTokens(queryTokens, member.title) || matchesAllTokens(queryTokens, member.name)
  );
};
