/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';
import { INTEGRATION_CATEGORY_DISPLAY } from '@kbn/custom-integrations-plugin/common';

import type { IntegrationCardItem } from '.';

import type { CategoryFacet } from './category_facets';

export function mergeCategoriesAndCount(
  eprCategoryList: CategoryFacet[], // EPR-categories from backend call to EPR
  cards: IntegrationCardItem[]
): CategoryFacet[] {
  const facets: CategoryFacet[] = [];

  const addIfMissing = (category: CategoryFacet) => {
    const match = facets.find((c) => {
      return c.id === category.id;
    });

    if (match) {
      match.count += category.count;
    } else {
      facets.push(category);
    }
  };

  // Seed the list with the dynamic categories from EPR and hardcoded ones from custom integrations
  eprCategoryList.forEach((facet) => {
    addIfMissing({ ...facet, count: 0 });
  });
  for (const [catId, facet] of Object.entries(INTEGRATION_CATEGORY_DISPLAY)) {
    addIfMissing({ ...facet, id: catId, count: 0 });
  }

  // Count all the categories
  cards.forEach((integration) => {
    integration.categories.forEach((catId: string) => {
      const category = INTEGRATION_CATEGORY_DISPLAY[catId as IntegrationCategory]
        ? INTEGRATION_CATEGORY_DISPLAY[catId as IntegrationCategory]
        : { title: catId };
      addIfMissing({ ...category, id: catId, count: 1 });
    });
  });

  const filledFacets = facets.filter((facet) => {
    return facet.count > 0;
  });

  filledFacets.sort((a, b) => {
    return a.id.localeCompare(b.id);
  });

  return filledFacets;
}
