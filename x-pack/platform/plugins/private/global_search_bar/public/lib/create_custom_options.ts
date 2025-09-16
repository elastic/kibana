/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';

export interface InformationOption {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
}

export interface NavigationOption {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  type?: string;
}

/**
 * Creates a search option for information/documentation items
 * These items will show "Documentation" on the right side with an external link icon
 */
export const createInformationOption = (
  info: InformationOption
): EuiSelectableTemplateSitewideOption => {
  return {
    key: info.id,
    label: info.title,
    url: info.url,
    type: 'information',
    itemType: 'information', // Custom property to identify the item type
    icon: { type: info.icon || 'documentation' },
    meta: info.description ? [{ text: info.description }] : undefined,
    'data-test-subj': `nav-search-option-${info.id}`,
  };
};

/**
 * Creates a search option for navigation items
 * These items will show "Navigate" on the right side
 */
export const createNavigationOption = (
  nav: NavigationOption
): EuiSelectableTemplateSitewideOption => {
  return {
    key: nav.id,
    label: nav.title,
    url: nav.url,
    type: nav.type || 'navigation',
    itemType: 'navigate', // Custom property to identify the item type
    icon: { type: nav.icon || 'apps' },
    meta: nav.description ? [{ text: nav.description }] : undefined,
    'data-test-subj': `nav-search-option-${nav.id}`,
  };
};
