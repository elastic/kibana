/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core-plugins-browser';
import {
  AgentBuilderSmlPublicPlugin,
  type AgentBuilderSmlPublicPluginSetup,
  type AgentBuilderSmlPublicPluginSetupDeps,
  type AgentBuilderSmlPublicPluginStart,
  type AgentBuilderSmlPublicPluginStartDeps,
} from './plugin';

export { smlSearchPath, smlAutocompletePath } from '../common/constants';
export { SML_HTTP_SEARCH_QUERY_MAX_LENGTH, SmlSearchFilterType } from '../common/http_api/sml';
export type {
  SmlSearchConstraints,
  SmlSearchFilters,
  SmlSearchHttpResponse,
  SmlAutocompleteHttpResponse,
} from '../common/http_api/sml';

export const plugin: PluginInitializer<
  AgentBuilderSmlPublicPluginSetup,
  AgentBuilderSmlPublicPluginStart,
  AgentBuilderSmlPublicPluginSetupDeps,
  AgentBuilderSmlPublicPluginStartDeps
> = (context: PluginInitializerContext) => new AgentBuilderSmlPublicPlugin(context);
