/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { KNOWLEDGE_BASE_TAB } from '@kbn/elastic-assistant/impl/assistant/settings/const';

/**
 * Opens the AI4DSOC knowledge base management page, filtered by knowledgeBaseEntryId.
 */
const openAI4DSOCKnowledgeBasePage = (
  navigateToApp: ApplicationStart['navigateToApp'],
  knowledgeBaseEntryId: string
) => {
  return navigateToApp('securitySolutionUI', {
    deepLinkId: SecurityPageName.configurationsAiSettings,
    path: `?tab=${KNOWLEDGE_BASE_TAB}&entry_search_term=${knowledgeBaseEntryId}`,
    openInNewTab: true,
  });
};

/**
 * Opens the Stack management knowledge base management page
 */
const openKnowledgeBasePage = (
  navigateToApp: ApplicationStart['navigateToApp'],
  knowledgeBaseEntryId: string
) =>
  navigateToApp('management', {
    path: `ai/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}&entry_search_term=${knowledgeBaseEntryId}`,
    openInNewTab: true,
  });

export const openKnowledgeBasePageByEntryId = (
  navigateToApp: ApplicationStart['navigateToApp'],
  knowledgeBaseEntryId: string,
  hasSearchAILakeConfigurations: boolean
) => {
  if (hasSearchAILakeConfigurations) {
    return openAI4DSOCKnowledgeBasePage(navigateToApp, knowledgeBaseEntryId);
  }
  return openKnowledgeBasePage(navigateToApp, knowledgeBaseEntryId);
};
