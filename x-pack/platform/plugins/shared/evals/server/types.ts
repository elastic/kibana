/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { DatasetService } from './storage/dataset_service';

export type EvalsPluginSetup = Record<string, never>;
export interface EvalsPluginStart {
  datasetService?: DatasetService;
}

export interface EvalsSetupDependencies {
  features: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface EvalsStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface EvalsRouteHandlerContext {
  datasetService: DatasetService;
}

export type EvalsRequestHandlerContext = CustomRequestHandlerContext<{
  evals: EvalsRouteHandlerContext;
}>;

export type EvalsRouter = IRouter<EvalsRequestHandlerContext>;
