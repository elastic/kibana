/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import { boostFeature } from './feature';
import { markBoostableIndices } from './lib/boostable_indices';
import { registerRoutes } from './routes';
import { boostPrototypeSavedObjectType } from './saved_objects/boost_prototype';
import type { BoostSetupDependencies } from './types';

export class BoostPlugin implements Plugin<void, void, BoostSetupDependencies> {
  public setup(core: CoreSetup, { features, indexManagement }: BoostSetupDependencies) {
    core.savedObjects.registerType(boostPrototypeSavedObjectType);
    features.registerKibanaFeature(boostFeature);
    registerRoutes(core.http.createRouter());
    indexManagement?.indexDataEnricher.add(markBoostableIndices);
  }

  public start() {}

  public stop() {}
}
