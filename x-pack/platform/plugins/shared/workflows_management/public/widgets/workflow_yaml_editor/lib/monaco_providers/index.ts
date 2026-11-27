/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Provider interfaces and types
export type {
  HoverContext,
  ActionContext,
  ParameterContext,
  StepContext,
  ActionInfo,
  ConnectorExamples,
  MonacoConnectorHandler,
  MonacoHandlerRegistry,
  ProviderConfig,
} from './provider_interfaces';

// Provider registry
export {
  getMonacoHandlerRegistry,
  registerMonacoConnectorHandler,
  getMonacoConnectorHandler,
  clearHandlerRegistry,
} from './provider_registry';

// Unified providers
export {
  UnifiedHoverProvider,
  createUnifiedHoverProvider,
  registerUnifiedHoverProvider,
} from './unified_hover_provider';

// REMOVED: UnifiedDecorationsProvider - no longer needed in new architecture
