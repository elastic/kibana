/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamDefinition } from '@kbn/streams-schema';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { StateDependencies, StreamChange } from '../types';
import type { State } from '../state';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type StreamChangeStatus = 'unchanged' | 'upserted' | 'deleted';

export abstract class StreamActiveRecord<TDefinition extends StreamDefinition = StreamDefinition> {
  protected _updated_definition: TDefinition;
  protected dependencies: StateDependencies;
  private _changeStatus: StreamChangeStatus = 'unchanged';

  constructor(definition: TDefinition, dependencies: StateDependencies) {
    this._updated_definition = definition;
    this.dependencies = dependencies;
  }

  public get definition(): TDefinition {
    return this._updated_definition;
  }

  protected get changeStatus(): StreamChangeStatus {
    return this._changeStatus;
  }

  // Used only when we try to rollback an existing stream or resync the stored State
  markAsCreated(): void {
    this._changeStatus = 'upserted';
  }

  // Used only when we failed to create a new stream and need to flip the stream to create deletion actions
  // from the same definition that we attempted to create
  markAsDeleted(): void {
    this._changeStatus = 'deleted';
  }

  hasChanged(): boolean {
    return this.changeStatus !== 'unchanged';
  }

  isDeleted(): boolean {
    return this.changeStatus === 'deleted';
  }

  async applyChange(
    change: StreamChange,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (change.type === 'delete') {
      return this.delete(change.name, desiredState, startingState);
    } else {
      return this.upsert(change.definition, desiredState, startingState);
    }
  }

  async delete(target: string, desiredState: State, startingState: State): Promise<StreamChange[]> {
    const { cascadingChanges, changeStatus } = await this.doHandleDeleteChange(
      target,
      desiredState,
      startingState
    );
    this._changeStatus = changeStatus;
    return cascadingChanges;
  }

  async upsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    const { cascadingChanges, changeStatus } = await this.doHandleUpsertChange(
      definition,
      desiredState,
      startingState
    );
    this._changeStatus = changeStatus;
    return cascadingChanges;
  }

  async validate(desiredState: State, startingState: State): Promise<ValidationResult> {
    try {
      return await this.doValidate(desiredState, startingState);
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

  abstract clone(): StreamActiveRecord;

  protected abstract doHandleUpsertChange(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }>;

  protected abstract doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }>;

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
