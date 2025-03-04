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

type StreamChangeStatus = 'unchanged' | 'upserted' | 'deleted';
type StreamCommitStatus = 'uncommitted' | 'committing' | 'committed' | 'failed';

export abstract class StreamActiveRecord<TDefinition extends StreamDefinition = StreamDefinition> {
  protected _definition: TDefinition;
  private changeStatus: StreamChangeStatus = 'unchanged';
  private commitStatus: StreamCommitStatus = 'uncommitted';
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

  async validate(desiredState: State, startingState: State): Promise<ValidationResult> {
    try {
      return this.doValidate(desiredState, startingState);
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }

  async commit(): Promise<void> {
    try {
      this.commitStatus = 'committing';
      if (this.changeStatus === 'upserted') {
        await this.doCommitUpsert();
      } else if (this.changeStatus === 'deleted') {
        await this.doCommitDelete();
      }
      this.commitStatus = 'committed';
    } catch (error) {
      // We should probably grab some error here?
      this.commitStatus = 'failed';
    }
  }

  async revert(desiredState: State, startingState: State): Promise<void> {
    if (startingState.has(this.definition.name)) {
      // Stream was updated or deleted
      const startingStateDefinition = startingState.get(this.definition.name)?.definition!;
      await this.upsert(startingStateDefinition, startingState, desiredState);
    } else {
      // Stream was created
      await this.delete(startingState, desiredState);
    }

    await this.commit();
  }

  hasChanged(): boolean {
    return this.changeStatus !== 'unchanged';
  }

  hasCommitted(): boolean {
    return this.commitStatus !== 'uncommitted';
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

  protected abstract doCommitUpsert(): Promise<void>;

  protected abstract doCommitDelete(): Promise<void>;
}
