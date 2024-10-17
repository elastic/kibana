/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export const KNOWLEDGE_BASE_TOUR_CONFIG_ANCHORS = {
  NAV_LINK: 'solutionSideNavItemLink-attack_discovery',
};

export const knowledgeBaseTourStepOne = {
  title: i18n.KNOWLEDGE_BASE_TOUR_KNOWLEDGE_BASE_TITLE,
  content: i18n.KNOWLEDGE_BASE_TOUR_KNOWLEDGE_BASE_DESC,
  // anchor: KNOWLEDGE_BASE_TOUR_CONFIG_ANCHORS.NAV_LINK,
};

export const tourConfig = {
  currentTourStep: 1,
  isTourActive: true,
};
