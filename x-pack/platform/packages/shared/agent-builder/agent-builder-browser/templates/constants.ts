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
export const BUILTIN_TAB_IDS = [TIMELINE_TAB_ID] as const;
