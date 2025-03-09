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
import { ElasticsearchAction } from './execution_plan';

export class WiredStream extends StreamActiveRecord<WiredStreamDefinition> {
  constructor(definition: WiredStreamDefinition, dependencies: StreamDependencies) {
    super(definition, dependencies);
    // What about the assets?
  }

  clone(): StreamActiveRecord<WiredStreamDefinition> {
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

  protected doDetermineCreateActions(): ElasticsearchAction[] {
    // Upsert component template
    // Upsert index template
    // Upsert data stream
    // Upsert ingest pipeline (processing and routing)
    // Upsert mapping/setting on write index
    // Upsert lifecycle on data stream
    // Upsert internal tracking document in .kibana_streams
    return [];
  }

  protected doDetermineUpdateActions(startingStateStream: WiredStream): ElasticsearchAction[] {
    // Some mix of the actions returned in doDetermineCreateActions but based on the diff between this stream and startingStateStream
    // Is there any case where some delete action would happen as part of an update?
    return [];
  }

  protected doDetermineDeleteActions(): ElasticsearchAction[] {
    // Delete component template
    // Delete index template
    // Delete data stream
    // Delete ingest pipeline (processing and routing)
    // Delete internal tracking document in .kibana_streams
    return [];
  }
}
