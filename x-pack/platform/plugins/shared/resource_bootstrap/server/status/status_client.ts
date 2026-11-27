/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  MAX_REPORTED_ERRORS,
  STATUS_SAVED_OBJECT_ID,
  STATUS_SAVED_OBJECT_TYPE,
  type BootstrapStatusAttributes,
} from '../../common';

/** Reads and replaces the single record of the last run; only the apply lock holder writes it. */
export class StatusClient {
  constructor(private readonly repository: ISavedObjectsRepository) {}

  async get(): Promise<BootstrapStatusAttributes | undefined> {
    try {
      const { attributes } = await this.repository.get<BootstrapStatusAttributes>(
        STATUS_SAVED_OBJECT_TYPE,
        STATUS_SAVED_OBJECT_ID
      );
      return attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async set(attributes: BootstrapStatusAttributes): Promise<void> {
    await this.repository.create(
      STATUS_SAVED_OBJECT_TYPE,
      { ...attributes, errors: attributes.errors.slice(0, MAX_REPORTED_ERRORS) },
      { id: STATUS_SAVED_OBJECT_ID, overwrite: true }
    );
  }
}
