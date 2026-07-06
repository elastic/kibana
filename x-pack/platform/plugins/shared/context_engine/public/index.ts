/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core-plugins-browser';
import {
  ContextEnginePublicPlugin,
  type ContextEnginePublicPluginSetup,
  type ContextEnginePublicPluginSetupDeps,
  type ContextEnginePublicPluginStart,
  type ContextEnginePublicPluginStartDeps,
} from './plugin';

export {
  contextEngineSearchPath,
  contextEngineAutocompletePath,
  internalApiPath,
} from '../common/constants';
export {
  CONTEXT_ENGINE_HTTP_SEARCH_QUERY_MAX_LENGTH,
  CONTEXT_ENGINE_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH,
  ContextEngineSearchFilterType,
} from '../common/http_api/context_engine';
export type {
  ContextEngineSearchConstraints,
  ContextEngineSearchFilters,
  ContextEngineSearchHttpResponse,
  ContextEngineSearchHttpResultItem,
  ContextEngineAutocompleteHttpResponse,
  ContextEngineAutocompleteHttpResultItem,
  ContextEngineMatchedDiscoveryLabel,
} from '../common/http_api/context_engine';

export const plugin: PluginInitializer<
  ContextEnginePublicPluginSetup,
  ContextEnginePublicPluginStart,
  ContextEnginePublicPluginSetupDeps,
  ContextEnginePublicPluginStartDeps
> = (context: PluginInitializerContext) => new ContextEnginePublicPlugin(context);
