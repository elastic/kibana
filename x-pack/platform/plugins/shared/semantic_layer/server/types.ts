/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SmlTypeDefinition, SmlService, SmlIndexAction } from './services/sml';

export interface SemanticLayerSetupDependencies {
  taskManager: TaskManagerSetupContract;
  features: FeaturesPluginSetup;
}

export interface SemanticLayerStartDependencies {
  taskManager: TaskManagerStartContract;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

/**
 * Setup contract of the semanticLayer plugin.
 */
export interface SemanticLayerPluginSetup {
  /**
   * Register an SML type definition.
   * Solutions can register their content types to make them discoverable via SML.
   */
  registerType: (definition: SmlTypeDefinition) => void;
}

/**
 * Parameters for the convenience indexAttachment API.
 */
export interface SemanticLayerIndexAttachmentParams {
  request: KibanaRequest;
  originId: string;
  attachmentType: string;
  action: SmlIndexAction;
  spaceId?: string;
}

/**
 * Start contract of the semanticLayer plugin.
 */
export interface SemanticLayerPluginStart {
  /**
   * Returns the full SML service for programmatic use (tools, routes, etc.).
   */
  getSmlService(): SmlService;
  /**
   * Convenience wrapper for event-driven indexing.
   */
  indexAttachment(params: SemanticLayerIndexAttachmentParams): Promise<void>;
}
