/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTabId } from '../tabs/tab_props';
import type { TabId } from '../tabs/tab_props';

/** `?side=chat` shows the side panel in Chat mode. */
export const SIDE_PARAM = 'side';
export const SIDE_CHAT_VALUE = 'chat';
/** `?from=<tab>` is the tab the Conversation tab was opened from; Collapse returns there. */
export const FROM_PARAM = 'from';

/** The tab the Conversation tab was opened from, or `overview` when unknown. */
export const getReturnTab = (params: URLSearchParams): Exclude<TabId, 'conversation'> => {
  const from = params.get(FROM_PARAM);
  return isTabId(from) && from !== 'conversation' ? from : 'overview';
};

/** The query string of "Collapse to side panel": the previous tab with the side panel in Chat mode. */
export const buildCollapseSearch = (currentSearch: string): string => {
  const returnTab = getReturnTab(new URLSearchParams(currentSearch));
  const params = new URLSearchParams();
  if (returnTab !== 'overview') {
    params.set('tab', returnTab);
  }
  params.set(SIDE_PARAM, SIDE_CHAT_VALUE);
  return `?${params.toString()}`;
};

/** The query string of the side panel's "Expand": the Conversation tab, remembering where it came from. */
export const buildExpandSearch = (fromTab: TabId, threadConversationId?: string): string => {
  const params = new URLSearchParams();
  params.set('tab', 'conversation');
  if (threadConversationId) {
    params.set('item', threadConversationId);
  }
  if (fromTab !== 'overview' && fromTab !== 'conversation') {
    params.set(FROM_PARAM, fromTab);
  }
  return `?${params.toString()}`;
};
