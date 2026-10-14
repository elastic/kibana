/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { ISpacesClient } from '../spaces_client';

export class InitialSolutionSetupService {
  private setupComplete = false;

  constructor(private readonly eligible: boolean) {}

  public isEligible(): boolean {
    return this.eligible;
  }

  public async isRequired(spacesClient: ISpacesClient): Promise<boolean> {
    if (!this.eligible || this.setupComplete) {
      return false;
    }

    try {
      const required = await spacesClient.isInitialSolutionSetupRequired();
      if (!required) {
        this.setupComplete = true;
      }
      return required;
    } catch (error) {
      // Startup race: default space may not exist yet. Soft-fail without caching.
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  public markComplete(): void {
    this.setupComplete = true;
  }
}
