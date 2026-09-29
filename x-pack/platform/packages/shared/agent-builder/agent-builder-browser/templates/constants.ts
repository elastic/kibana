/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIMELINE_TAB_ID = 'timeline';

/**
 * Agent Builder's own tabs, always appended to the conversation metadata flyout after
 * the template's tabs.
 */
export const BUILTIN_TAB_IDS = [] as const;

/**
 * EUI flyout `historyKey` of the conversation details flyout. A flyout opened from its content
 * with `session: 'start'` and this key stacks on top of it with a Back button; closing either one
 * closes the whole stack.
 */
export const CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY = Symbol.for(
  'agentBuilder.conversationDetailsFlyout'
);
