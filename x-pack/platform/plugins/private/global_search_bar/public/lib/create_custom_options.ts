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

export interface ActionOption {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
}

export interface ChatOption {
  id: string;
  title: string;
  description?: string;
  icon?: string;
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

/**
 * Creates a search option for action items
 * These items will show "Action" on the right side and follow a link when clicked
 */
export const createActionOption = (
  action: ActionOption
): EuiSelectableTemplateSitewideOption => {
  return {
    key: action.id,
    label: action.title,
    url: action.url,
    type: 'action',
    itemType: 'action', // Custom property to identify the item type
    icon: { type: action.icon || 'arrowRight' },
    meta: action.description ? [{ text: action.description }] : undefined,
    'data-test-subj': `nav-search-option-${action.id}`,
  };
};

/**
 * Creates a search option for chat items
 * These items will show "Chat" on the right side and open AI assistant flyout when clicked
 */
export const createChatOption = (
  chat: ChatOption
): EuiSelectableTemplateSitewideOption => {
  return {
    key: chat.id,
    label: chat.title,
    url: '#', // Chat items don't need URLs as they trigger AI assistant
    type: 'chat',
    itemType: 'chat', // Custom property to identify the item type
    icon: { type: chat.icon || 'discuss' },
    meta: chat.description ? [{ text: chat.description }] : undefined,
    'data-test-subj': `nav-search-option-${chat.id}`,
  };
};
