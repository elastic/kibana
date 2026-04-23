/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SmlTypeDefinition, SmlService, SmlIndexAction } from './services/sml/types';

export interface SemanticLayerSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface SemanticLayerStartDependencies {
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
}

export interface SemanticLayerPluginSetup {
  registerType: (definition: SmlTypeDefinition) => void;
}

export interface SemanticLayerPluginStart {
  getSmlService: () => SmlService;
  indexAttachment: (params: {
    request: KibanaRequest;
    originId: string;
    attachmentType: string;
    action: SmlIndexAction;
    spaceId?: string;
  }) => Promise<void>;
}
