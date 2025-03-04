/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  StreamDefinition,
  WiredStreamDefinition,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { isResponseError } from '@kbn/es-errors';
import { State, StreamChange } from './state';
import { StreamActiveRecord, ValidationResult, StreamDependencies } from './stream_active_record';
import { syncWiredStreamDefinitionObjects } from '../helpers/sync';
import { deleteStreamObjects } from '../stream_crud';

export class WiredStream extends StreamActiveRecord<WiredStreamDefinition> {
  constructor(definition: WiredStreamDefinition, dependencies: StreamDependencies) {
    super(definition, dependencies);
    // What about the assets?
  }

  public clone(): StreamActiveRecord<WiredStreamDefinition> {
    return new WiredStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doUpsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (!isWiredStreamDefinition(definition)) {
      throw new Error('Cannot change stream types');
    }

    this._definition = definition;

    return [];
  }

  protected async doDelete(desiredState: State, startingState: State): Promise<StreamChange[]> {
    // Maybe remove children for example
    return [];
  }

  protected async doValidate(desiredState: State, startingState: State): Promise<ValidationResult> {
    const existsInStartingState = startingState.has(this.definition.name);

    if (!existsInStartingState) {
      // Check for data stream conflict
      const dataStreamResult =
        await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
          name: this.definition.name,
        });

      if (dataStreamResult.data_streams.length !== 0) {
        return {
          isValid: false,
          errors: [
            `Cannot create wired stream "${this.definition.name}" due to conflict caused by existing data stream`,
          ],
        };
      }

      // Check for index conflict
      await this.dependencies.scopedClusterClient.asCurrentUser.indices
        .get({
          index: this.definition.name,
        })
        .catch((error) => {
          if (!(isResponseError(error) && error.statusCode === 404)) {
            throw error;
          }
        });

      return {
        isValid: false,
        errors: [
          `Cannot create wired stream "${this.definition.name}" due to conflict caused by existing index`,
        ],
      };
    }

    return { isValid: true, errors: [] };
  }

  protected async doCommitUpsert(): Promise<void> {
    await this.dependencies.storageClient.index({
      id: this.definition.name,
      document: this.definition,
    });

    await syncWiredStreamDefinitionObjects({
      definition: this.definition,
      logger: this.dependencies.logger,
      scopedClusterClient: this.dependencies.scopedClusterClient,
      isServerless: this.dependencies.isServerless,
    });
    // Also update lifecycle

    // Update assets
  }

  protected async doCommitDelete(): Promise<void> {
    await deleteStreamObjects({
      name: this.definition.name,
      scopedClusterClient: this.dependencies.scopedClusterClient,
      logger: this.dependencies.logger,
    });

    // Update assets

    await this.dependencies.storageClient.delete({ id: this.definition.name });
  }
}
