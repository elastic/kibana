/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMatchingCollectionMembers } from '../../../../../../services/collections';

import type { IntegrationCardItem } from './card_utils';

/**
 * When the search term matched a service bundled behind the card (`searchMembers`) rather than
 * the card itself, annotates the card with the matching services so it can explain why it showed up.
 * Returns the card untouched otherwise.
 */
export const withSearchMemberMatch = (
  card: IntegrationCardItem,
  searchTerm?: string
): IntegrationCardItem => {
  // Tiles that bundle services name them explicitly (AWS onboarding); collection tiles bundle
  // their member integrations.
  const members =
    card.searchMembers ?? card.groupMembers?.map(({ name, title }) => ({ name, title }));
  const matches = getMatchingCollectionMembers(
    { title: card.title, name: card.name },
    members ?? [],
    searchTerm
  );
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
