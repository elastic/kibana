/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext } from '@kbn/core/public';
import { CaseSuggestionRegistryPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new CaseSuggestionRegistryPlugin(initializerContext);
};

export type { CaseSuggestionResponse } from '../common/types';

export type {
  CaseSuggestionDefinitionPublic,
  CaseSuggestionChildrenProps,
} from './services/case_suggestion_registry_public';

export type {
  CaseSuggestionRegistryPublicSetup,
  CaseSuggestionRegistryPublicStart,
} from './plugin';
