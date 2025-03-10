/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { StreamDefinition } from '@kbn/streams-schema';
import { State, StreamChange } from './state'; // Does this create a circular dependency?
import { StreamsStorageClient } from '../service';
import { AssetClient } from '../assets/asset_client';
import { ElasticsearchAction } from './execution_plan';

export interface StreamDependencies {
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  storageClient: StreamsStorageClient;
  logger: Logger;
  isServerless: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[]; // Or Errors?
}

type StreamChangeStatus = 'unchanged' | 'upserted' | 'deleted';

export abstract class StreamActiveRecord<TDefinition extends StreamDefinition = StreamDefinition> {
  protected _updated_definition: TDefinition;
  protected dependencies: StreamDependencies;
  private changeStatus: StreamChangeStatus = 'unchanged';

  constructor(definition: TDefinition, dependencies: StreamDependencies) {
    this._updated_definition = definition;
    this.dependencies = dependencies;
  }

  public get definition(): TDefinition {
    return this._updated_definition;
  }

  async applyChange(
    change: StreamChange,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    // What if this stream is already in a changed state?

    try {
      if (change.type === 'delete') {
        return this.delete(desiredState, startingState);
      } else {
        return this.upsert(change.request.stream, desiredState, startingState);
      }
    } catch (error) {
      // Here we might return { changedSuccessfully: boolean; errors: Error[] }
      return [];
    }
  }

  async delete(desiredState: State, startingState: State): Promise<StreamChange[]> {
    try {
      const cascadingChanges = await this.doDelete(desiredState, startingState);
      this.changeStatus = 'deleted';
      return cascadingChanges;
    } catch (error) {
      // Here we might return { changedSuccessfully: boolean; errors: Error[] }
      return [];
    }
  }

  async upsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    try {
      const cascadingChanges = await this.doUpsert(definition, desiredState, startingState);
      this.changeStatus = 'upserted';
      return cascadingChanges;
    } catch (error) {
      // Here we might return { changedSuccessfully: boolean; errors: Error[] }
      return [];
    }
  }

  // Used only when we failed to create a new stream and need to flip the stream to create deletion actions
  // from the same definition that we attempted to create
  markAsDeleted(): void {
    this.changeStatus = 'deleted';
  }

  async validate(desiredState: State, startingState: State): Promise<ValidationResult> {
    try {
      return this.doValidate(desiredState, startingState);
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }

  determineElasticsearchActions(
    desiredState: State,
    startingState: State,
    startingStateStream?: StreamActiveRecord<TDefinition>
  ): Promise<ElasticsearchAction[]> {
    if (this.changeStatus === 'upserted') {
      if (startingStateStream) {
        return this.doDetermineUpdateActions(desiredState, startingState, startingStateStream);
      } else {
        return this.doDetermineCreateActions();
      }
    } else if (this.changeStatus === 'deleted') {
      return this.doDetermineDeleteActions();
    }

    throw new Error('Cannot determine Elasticsearch actions for an unchanged stream');
  }

  hasChanged(): boolean {
    return this.changeStatus !== 'unchanged';
  }

  isDeleted(): boolean {
    return this.changeStatus === 'deleted';
  }

  abstract clone(): StreamActiveRecord;

  protected abstract doUpsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]>;

  protected abstract doDelete(desiredState: State, startingState: State): Promise<StreamChange[]>;

  protected abstract doValidate(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult>;

  protected abstract doDetermineCreateActions(): Promise<ElasticsearchAction[]>;
  protected abstract doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: StreamActiveRecord<TDefinition>
  ): Promise<ElasticsearchAction[]>;
  protected abstract doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
}
