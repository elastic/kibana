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

export interface ElasticsearchAction {
  type: string; // A bunch of types to model based on Joe's list
}

type StreamChangeStatus = 'unchanged' | 'upserted' | 'deleted';

export abstract class StreamActiveRecord<TDefinition extends StreamDefinition = StreamDefinition> {
  protected _definition: TDefinition;
  protected changeStatus: StreamChangeStatus = 'unchanged';
  protected dependencies: StreamDependencies;

  constructor(definition: TDefinition, dependencies: StreamDependencies) {
    this._definition = definition;
    this.dependencies = dependencies;
  }

  public get definition(): TDefinition {
    return this._definition;
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

  hasChanged(): boolean {
    return this.changeStatus !== 'unchanged';
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

  abstract determineElasticsearchActions(
    startingStateStream?: StreamActiveRecord<TDefinition>
  ): ElasticsearchAction[];
}
