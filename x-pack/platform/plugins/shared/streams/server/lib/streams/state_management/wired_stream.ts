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
import { IScopedClusterClient } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { InternalIStorageClient, ApplicationDocument } from '@kbn/storage-adapter';
import { cloneDeep } from 'lodash';
import { isResponseError } from '@kbn/es-errors';
import { State } from './state';
import { StreamActiveRecord, ValidationResult } from './stream_active_record';
import { syncWiredStreamDefinitionObjects } from '../helpers/sync';
import { deleteStreamObjects } from '../stream_crud';

export class WiredStream extends StreamActiveRecord<WiredStreamDefinition> {
  constructor(definition: WiredStreamDefinition) {
    super(definition); // Maybe the subclass should double check here that it was really given the right type of definition?
    // What about the assets?
  }

  public clone(): StreamActiveRecord<WiredStreamDefinition> {
    return new WiredStream(cloneDeep(this._definition));
  }

  protected doUpsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): void {
    if (!isWiredStreamDefinition(definition)) {
      throw new Error('Cannot change stream types');
    }

    this._definition = definition;
  }

  protected doDelete(desiredState: State, startingState: State): void {
    // Maybe remove children for example
  }

  protected async doValidate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    const existsInStartingState = startingState.has(this.definition.name);

    if (!existsInStartingState) {
      // Check for data stream conflict
      const dataStreamResult = await scopedClusterClient.asCurrentUser.indices.getDataStream({
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
      await scopedClusterClient.asCurrentUser.indices
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

  protected async doCommitUpsert(
    storageClient: InternalIStorageClient<ApplicationDocument<StreamDefinition>>,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ): Promise<void> {
    await storageClient.index({
      id: this.definition.name,
      document: this.definition,
    });

    await syncWiredStreamDefinitionObjects({
      definition: this.definition,
      logger,
      scopedClusterClient,
      isServerless,
    });
    // Also update lifecycle

    // Update assets
  }

  protected async doCommitDelete(
    storageClient: InternalIStorageClient<ApplicationDocument<StreamDefinition>>,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ): Promise<void> {
    await deleteStreamObjects({ scopedClusterClient, name: this.definition.name, logger });

    // Update assets

    await storageClient.delete({ id: this.definition.name });
  }
}
