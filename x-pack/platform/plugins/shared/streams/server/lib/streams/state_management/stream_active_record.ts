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

  constructor(definition: TDefinition) {
    this._definition = definition;
  }

  public get definition() {
    return this._definition;
  }

  public applyChange(change: StreamChange, desiredState: State, startingState: State): void {
    if (change.type === 'delete') {
      this.delete(desiredState, startingState);
    } else {
      this.upsert(change.request.stream, desiredState, startingState);
    }
  }

  public delete(desiredState: State, startingState: State) {
    try {
      this.doDelete(desiredState, startingState);
      this.changeStatus = 'deleted';
    } catch (error) {
      // Here we might return { changedSuccessfully: boolean; errors: Error[] }
    }
  }

  public upsert(definition: StreamDefinition, desiredState: State, startingState: State) {
    try {
      this.doUpsert(definition, desiredState, startingState);
      this.changeStatus = 'upserted';
    } catch (error) {
      // Here we might return { changedSuccessfully: boolean; errors: Error[] }
    }
  }

  public async validate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult> {
    try {
      return this.doValidate(desiredState, startingState, scopedClusterClient);
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }

  public async commit(
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ) {
    try {
      this.commitStatus = 'committing';
      if (this.changeStatus === 'upserted') {
        this.doCommitUpsert(storageClient, logger, scopedClusterClient, isServerless);
      } else if (this.changeStatus === 'deleted') {
        this.doCommitDelete(storageClient, logger, scopedClusterClient, isServerless);
      }
      this.commitStatus = 'committed';
    } catch (error) {
      // We should probably grab some error here?
      this.commitStatus = 'failed';
    }
  }

  public async revert(
    desiredState: State,
    startingState: State,
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ) {
    if (this.changeStatus === 'upserted') {
      if (startingState.has(this.definition.name)) {
        // Stream was updated, revert to previous state
        const startingStateDefinition = startingState.get(this.definition.name)?.definition!;
        this.upsert(startingStateDefinition, startingState, desiredState);
      } else {
        // Stream was created, delete it
        this.delete(startingState, desiredState);
      }
    } else if (this.changeStatus === 'deleted') {
      // Stream was deleted, revert to previous state
      const startingStateDefinition = startingState.get(this.definition.name)?.definition!;
      this.upsert(startingStateDefinition, startingState, desiredState);
    }

    await this.commit(storageClient, logger, scopedClusterClient, isServerless);
  }

  public hasChanged(): boolean {
    return this.changeStatus !== 'unchanged';
  }

  public hasCommitted(): boolean {
    return this.commitStatus !== 'uncommitted';
  }

  public abstract clone(): StreamActiveRecord;

  protected abstract doUpsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): void;

  protected abstract doDelete(desiredState: State, startingState: State): void;

  protected abstract doValidate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult>;

  protected abstract doCommitUpsert(
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ): Promise<void>;

  protected abstract doCommitDelete(
    storageClient: StreamsStorageClient,
    logger: Logger,
    scopedClusterClient: IScopedClusterClient,
    isServerless: boolean
  ): Promise<void>;
}
