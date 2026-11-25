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
  {
    keywords: [
      'person',
      'people',
      'user',
      'human',
      'contact',
      'customer',
      'member',
      'account',
      'employee',
      'individual',
      'owner',
    ],
    icon: 'user',
  },
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

/** Rows for the graph symbol table; `subtype` drives colors and labels. */
export interface KiGraphSymbolLegendItem {
  kind: KiGraphNodeKind;
  icon: string;
  subtype: string;
}

export const KI_GRAPH_SYMBOL_LEGEND_ITEMS: readonly KiGraphSymbolLegendItem[] = [
  { kind: 'entity', icon: 'user', subtype: 'person' },
  { kind: 'entity', icon: 'pin', subtype: 'place' },
  { kind: 'entity', icon: 'users', subtype: 'organization' },
  { kind: 'entity', icon: 'folderOpen', subtype: 'project' },
  { kind: 'entity', icon: 'calendar', subtype: 'event' },
  { kind: 'entity', icon: DEFAULT_ENTITY_ICON, subtype: 'topic' },
  { kind: 'fact', icon: FACT_ICON, subtype: 'preference' },
];

const PERSON_USER_ENTITY_SUBTYPES = new Set([
  'person',
  'people',
  'user',
  'human',
  'contact',
  'customer',
  'member',
  'account',
  'employee',
  'individual',
  'owner',
]);

const subtypeTokens = (subtype: string): readonly string[] =>
  subtype
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length > 0);

const tokenMatchesKeyword = (token: string, keyword: string): boolean => {
  if (token === keyword) {
    return true;
  }
  if (keyword.endsWith('s') && token === keyword.slice(0, -1)) {
    return true;
  }
  if (token.endsWith('s') && keyword === token.slice(0, -1)) {
    return true;
  }
  return false;
};

const subtypeMatchesIcons = (tokens: readonly string[], keywords: readonly string[]): boolean =>
  keywords.some((keyword) => tokens.some((token) => tokenMatchesKeyword(token, keyword)));

export const isPersonLikeEntitySubtype = (subtype: string): boolean => {
  const normalized = subtype.trim().toLowerCase();
  if (PERSON_USER_ENTITY_SUBTYPES.has(normalized)) {
    return true;
  }
  const tokens = subtypeTokens(subtype);
  return tokens.some((token) => PERSON_USER_ENTITY_SUBTYPES.has(token));
};

export const getKiGraphNodeIcon = (kind: KiGraphNodeKind, subtype: string): string => {
  if (kind === 'fact') {
    return FACT_ICON;
  }
  if (isPersonLikeEntitySubtype(subtype)) {
    return 'user';
  }
  const tokens = subtypeTokens(subtype);
  const match = ENTITY_ICONS.find(({ keywords }) => subtypeMatchesIcons(tokens, keywords));
  return match?.icon ?? DEFAULT_ENTITY_ICON;
};
