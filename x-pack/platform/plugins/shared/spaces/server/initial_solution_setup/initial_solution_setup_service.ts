/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { InitialSolutionSetupView } from '../../common';
import type { ISpacesClient } from '../spaces_client';

interface Deps {
  enabled: boolean;
}

export class InitialSolutionSetupService {
  private setupComplete = false;

  constructor(private readonly deps: Deps) {}

  public async isRequired(spacesClient: ISpacesClient) {
    if (!this.deps.enabled || this.setupComplete) {
      return false;
    }

    try {
      const isRequired = await spacesClient.isInitialSolutionSetupRequired();
      this.setupComplete = !isRequired;
      return isRequired;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  public async complete(spacesClient: ISpacesClient, solution: InitialSolutionSetupView) {
    if (!this.deps.enabled) {
      throw Boom.forbidden('Initial solution setup is disabled');
    }

    await spacesClient.completeInitialSolutionSetup(solution);
    this.setupComplete = true;
  }
}
