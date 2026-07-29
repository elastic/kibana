/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { SolutionView } from '../../common';
import type { SpaceSavedObjectAttributes } from '../types';

interface Deps {
  enabled: boolean;
  getSavedObjects: () => Promise<Pick<SavedObjectsServiceStart, 'createInternalRepository'>>;
}

export class InitialSolutionSetupService {
  private setupComplete = false;

  constructor(private readonly deps: Deps) {}

  public async isRequired() {
    if (!this.deps.enabled || this.setupComplete) {
      return false;
    }

    const repository = await this.getRepository();
    try {
      const space = await repository.get<SpaceSavedObjectAttributes>('space', DEFAULT_SPACE_ID);
      const isRequired = space.attributes.solutionSetupRequired === true;
      this.setupComplete = !isRequired;
      return isRequired;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  public async complete(solution: SolutionView) {
    if (!this.deps.enabled) {
      throw Boom.forbidden('Initial solution setup is disabled');
    }

    const repository = await this.getRepository();
    const space = await repository.get<SpaceSavedObjectAttributes>('space', DEFAULT_SPACE_ID);

    if (space.attributes.solutionSetupRequired !== true) {
      throw Boom.conflict('Initial solution setup is already complete');
    }

    await repository.update<SpaceSavedObjectAttributes>(
      'space',
      DEFAULT_SPACE_ID,
      {
        solution,
        solutionSetupRequired: false,
      },
      { version: space.version }
    );
    this.setupComplete = true;
  }

  private async getRepository() {
    const { createInternalRepository } = await this.deps.getSavedObjects();
    return createInternalRepository(['space']);
  }
}
