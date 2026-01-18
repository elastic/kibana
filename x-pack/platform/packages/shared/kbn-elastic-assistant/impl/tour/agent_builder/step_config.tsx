/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export interface AgentBuilderTourState {
  currentTourStep: number;
  isTourActive: boolean;
}

export const tourDefaultConfig: AgentBuilderTourState = {
  currentTourStep: 1,
  isTourActive: true,
};

export const agentBuilderTourStep1 = {
  title: i18n.AGENT_BUILDER_TOUR_TITLE,
  content: i18n.AGENT_BUILDER_TOUR_CONTENT,
};
