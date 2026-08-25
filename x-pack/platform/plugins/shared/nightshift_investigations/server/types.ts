/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { NightshiftInvestigationsClient } from './client/investigations_client';

export type NightshiftInvestigationsServerSetup = void;

export interface NightshiftInvestigationsServerStart {
  getInvestigationsClient: (request: KibanaRequest) => NightshiftInvestigationsClient;
}

export interface NightshiftInvestigationsSetupDeps {
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface NightshiftInvestigationsStartDeps {
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}
