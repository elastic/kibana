/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGraphNodeKind } from './types';

interface SubtypeIcon {
  keywords: readonly string[];
  icon: string;
}

// Entity types are free text set in the dreaming config, so match on keywords.
const ENTITY_ICONS: readonly SubtypeIcon[] = [
  { keywords: ['person', 'people', 'user', 'human', 'contact', 'customer'], icon: 'user' },
  {
    keywords: ['place', 'city', 'country', 'location', 'region', 'address', 'venue'],
    icon: 'pin',
  },
  {
    keywords: ['organization', 'organisation', 'org', 'company', 'team', 'group', 'employer'],
    icon: 'users',
  },
  { keywords: ['project', 'initiative', 'product', 'repo'], icon: 'folderOpen' },
  { keywords: ['event', 'meeting', 'trip'], icon: 'calendar' },
];

const DEFAULT_ENTITY_ICON = 'cluster';
const FACT_ICON = 'document';

export const getKiGraphNodeIcon = (kind: KiGraphNodeKind, subtype: string): string => {
  if (kind === 'fact') {
    return FACT_ICON;
  }
  const normalized = subtype.toLowerCase();
  const match = ENTITY_ICONS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );
  return match?.icon ?? DEFAULT_ENTITY_ICON;
};
