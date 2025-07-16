/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext } from '@kbn/core/public';
import { ObservabilityCaseSuggestionRegistryPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new ObservabilityCaseSuggestionRegistryPlugin(initializerContext);
};

export type { SuggestionPayload } from '../common/types';

export type {
  SuggestionDefinitionPublic,
  SuggestionDefinitionPublicProps,
} from './services/case_suggestion_registry';

export type {
  ObservabilityCaseSuggestionRegistryPluginSetup,
  ObservabilityCaseSuggestionRegistryPluginStart,
} from './plugin';
