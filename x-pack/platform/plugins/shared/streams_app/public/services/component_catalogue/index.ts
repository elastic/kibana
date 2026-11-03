/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ComponentCatalogueClient, FetchedComponentCatalogue } from './types';
export { createComponentCatalogueClient } from './api_client';
export {
  createComponentChecker,
  toComponentChecker,
  type ComponentCheck,
  type ComponentChecker,
} from './component_check';
export {
  isCatalogueSupported,
  isDefinitionUsable,
  toEditableCatalogue,
} from './catalogue_compatibility';
export {
  getDefinition,
  listComponents,
  resolveEnumOptions,
  resolvePathOptions,
  supportsAnySignal,
  type PathScope,
} from './catalogue_selectors';
export { useComponentCatalogue, type ComponentCatalogueState } from './use_component_catalogue';
