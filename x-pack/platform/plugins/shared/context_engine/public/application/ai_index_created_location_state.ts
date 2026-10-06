/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AiIndexCreatedLocationState {
  aiIndexCreated: boolean;
}

export const AI_INDEX_CREATED_LOCATION_STATE: AiIndexCreatedLocationState = {
  aiIndexCreated: true,
};

/** Navigated with this state to land back on the Knowledge Indicators tab, e.g. from the KI detail page. */
export interface AiIndexSelectedTabLocationState {
  selectedTab: 'knowledge_indicators';
}

export const AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE: AiIndexSelectedTabLocationState = {
  selectedTab: 'knowledge_indicators',
};
