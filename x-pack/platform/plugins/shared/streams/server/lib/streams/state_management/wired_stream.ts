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
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { State } from './state';
import {
  StreamActiveRecord,
  StreamChangeStatus,
  StreamCommitStatus,
  ValidationResult,
} from './types';
import { StreamsStorageClient } from '../service';
import { syncWiredStreamDefinitionObjects } from '../helpers/sync';
import { deleteStreamObjects } from '../stream_crud';

export class WiredStream implements StreamActiveRecord {
  definition: WiredStreamDefinition;
  changeStatus: StreamChangeStatus;
  commitStatus: StreamCommitStatus;

  constructor(definition: WiredStreamDefinition) {
    // What about the assets?
    this.definition = definition;
    this.changeStatus = 'unchanged';
    this.commitStatus = 'uncomitted';
  }

  clone(): StreamActiveRecord {
    return new WiredStream(cloneDeep(this.definition));
  }

  markForDeletion(): void {
    this.changeStatus = 'deleted';
  }

  update(newDefinition: StreamDefinition) {
    if (isWiredStreamDefinition(newDefinition)) {
      this.definition = newDefinition; // Perhaps it should avoid this if the definition are the same?
      this.changeStatus = 'upserted';
    } else {
      throw new Error('Cannot apply this change');
    }
  }

  async validate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    const existsInStartingState = startingState.streams.has(this.definition.name);

    if (!existsInStartingState) {
      // Check for data stream conflict
      try {
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
      } catch (error) {
        // What if this errors?
      }

      // Check for index conflict
      try {
        await scopedClusterClient.asCurrentUser.indices.get({
          index: this.definition.name,
        });

        return {
          isValid: false,
          errors: [
            `Cannot create wired stream "${this.definition.name}" due to conflict caused by existing index`,
          ],
        };
      } catch (error) {
        // What if this errors?
      }
    }

    return { isValid: true, errors: [] };
  }

  async commit(
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ): Promise<void> {
    this.commitStatus = 'committing';

    if (this.changeStatus === 'upserted') {
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
    } else if (this.changeStatus === 'deleted') {
      await deleteStreamObjects({ scopedClusterClient, name: this.definition.name, logger });

      // Update assets

      await storageClient.delete({ id: this.definition.name });
    }

    this.commitStatus = 'committed';
  }
}
