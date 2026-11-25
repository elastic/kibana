/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

export interface WikiPageTypeDefinition {
  /** Level-two heading that entries are added under. The page gets it when the first entry lands. */
  entriesHeading: string;
}

export interface WikiDefinition {
  /** Workflows name the wiki by this id; it is part of no stored document. */
  id: string;
  /**
   * Elasticsearch index that holds the pages. Every read and write runs as the workflow's own
   * identity, so that identity needs read and write on this index.
   */
  index: string;
  pageTypes: Record<string, WikiPageTypeDefinition>;
}

export interface AgentKnowledgePluginSetup {
  /** Makes a wiki available to the recall and record steps. Ids are unique across plugins. */
  registerWiki: (definition: WikiDefinition) => void;
}

export type AgentKnowledgePluginStart = Record<string, never>;

export interface AgentKnowledgeSetupDependencies {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface AgentKnowledgeStartDependencies {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}
