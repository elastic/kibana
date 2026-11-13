/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';

// Lazy-imported so a disabled plugin never parses its implementation.
export async function plugin(initializerContext: PluginInitializerContext) {
  const { AgentKnowledgePlugin } = await import('./plugin');
  return new AgentKnowledgePlugin(initializerContext);
}

export type {
  AgentKnowledgePluginSetup,
  AgentKnowledgePluginStart,
} from './types';

// Wiki store helpers are dependency-light and re-exported so Nightshift can wrap without
// loading the plugin class when the plugin is disabled.
export {
  canonicalizeSlug,
  canonicalWikiId,
  createWikiPageStore,
  isVersionConflict,
  slugFromWikiId,
  statusAfterCorroboration,
  toWikiKiId,
  toWikiPageId,
} from './wiki/page_store';
export type { WikiPageStore, WikiPageWrite } from './wiki/page_store';
export { lintWikiContent } from './wiki/lint_content';
export type { WikiLintRule, WikiLintViolation } from './wiki/lint_content';
export { dropEmptySections } from './wiki/drop_empty_sections';
