/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { notebookFeature } from './feature';
import { registerNotebookRoutes } from './routes';
import { notebookSavedObjectType } from './saved_object';

interface NotebookServerSetupDeps {
  features: FeaturesPluginSetup;
}

export class NotebookServerPlugin implements Plugin<void, void, NotebookServerSetupDeps> {
  public setup(core: CoreSetup, { features }: NotebookServerSetupDeps): void {
    core.savedObjects.registerType(notebookSavedObjectType);
    features.registerKibanaFeature(notebookFeature);
    registerNotebookRoutes(core.http.createRouter());
  }

  public start(): void {}

  public stop(): void {}
}
