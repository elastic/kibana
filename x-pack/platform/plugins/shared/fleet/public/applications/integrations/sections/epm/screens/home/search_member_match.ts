/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from './card_utils';

const MAX_DESCRIPTION_MATCHES = 3;

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
 * When the search term matched a service bundled behind the card (`searchMembers`) rather than
 * the card itself, annotates the card with the matching services so it can explain why it showed up.
 * Returns the card untouched otherwise.
 */
export const withSearchMemberMatch = (
  card: IntegrationCardItem,
  searchTerm?: string
): IntegrationCardItem => {
  const queryTokens = tokenize(searchTerm ?? '');
  if (queryTokens.length === 0 || !card.searchMembers?.length) {
    return card;
  }

  // The term is about the card itself ("aws", "amazon"): the generic description fits.
  if (matchesAllTokens(queryTokens, `${card.title} ${card.name}`)) {
    return card;
  }

  // Services are named by title or name. When none match that way, the term may come from a
  // service's description (e.g. "flow logs" for "Amazon VPC"), so fall back to that.
  const byTitleOrName = card.searchMembers.filter(
    (member) =>
      matchesAllTokens(queryTokens, member.title) || matchesAllTokens(queryTokens, member.name)
  );
  const byDescription =
    byTitleOrName.length > 0
      ? []
      : card.searchMembers.filter(
          (member) => member.description && matchesAllTokens(queryTokens, member.description)
        );
  // Descriptions share generic words ("collect", "agent", "logs"). A term that matches most of
  // them isn't about a particular service, so don't claim one.
  const matches =
    byTitleOrName.length > 0
      ? byTitleOrName
      : byDescription.length <= MAX_DESCRIPTION_MATCHES
      ? byDescription
      : [];
  if (matches.length === 0) {
    return card;
  }

  return {
    ...card,
    searchMemberMatch: {
      memberTitles: matches.map((member) => member.title),
      collectionTitle: card.title,
    },
  };
};
