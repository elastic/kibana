/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityTypeLogo as typeLogo, type EntityTypeIcon } from '@kbn/entity-centric-lab-flyout';
import { AWS_CATEGORY_DESCRIPTOR, ENTITY_CATEGORIES } from './fake_entities';

export type { EntityTypeIcon };

/**
 * Icon shown beside an inventory type or category label in the list and
 * the hex map. Type logos win; category labels fall back to the nav icon.
 */
const CATEGORY_LOGOS: Readonly<Record<string, string>> = Object.fromEntries(
  [AWS_CATEGORY_DESCRIPTOR, ...ENTITY_CATEGORIES].flatMap((category) => [
    [category.id, category.icon],
    [category.label.toLowerCase(), category.icon],
  ])
);

export const entityTypeLogo = (label: string | undefined): EntityTypeIcon | undefined => {
  const fromType = typeLogo(label);
  if (fromType) return fromType;
  if (!label) return undefined;
  return CATEGORY_LOGOS[label.trim().toLowerCase()];
};
