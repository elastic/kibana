/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { StateDependencies, StreamChange } from '../types';
import type { State } from '../state';

export interface ValidationResult {
  isValid: boolean;
  errors: Error[];
}

export interface PrintableStream {
  changeStatus: StreamChangeStatus;
  definition: Streams.all.Definition;
  [key: string]: unknown;
}

export type StreamChangeStatus = 'unchanged' | 'upserted' | 'deleted';

export type StreamChanges = Record<string, boolean>;

/**
 * The StreamActiveRecord is responsible for maintaining the change status of a stream
 * And routing change requests (with cascading changes), validation requests and requests to determine Elasticsearch actions
 * to the right hook based on this state
 */
export abstract class StreamActiveRecord<
  TDefinition extends Streams.all.Definition = Streams.all.Definition
> {
  protected dependencies: StateDependencies;
  protected _definition: TDefinition;
  protected _changes: StreamChanges = {};
  private _changeStatus: StreamChangeStatus = 'unchanged';

  constructor(definition: TDefinition, dependencies: StateDependencies) {
    this._definition = definition;
    this.dependencies = dependencies;
  }

  public get name(): string {
    return this._definition.name;
  }

  public get definition(): TDefinition {
    return this._definition;
  }

  public get changeStatus(): StreamChangeStatus {
    return this._changeStatus;
  }

  // Used only when we try to resync the stored State
  markAsUpserted(): void {
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

  // Apply change asks the stream to consider an incoming change
  // If the change targets the stream it should update itself and fire any cascading changes
  // That might affect its children or its parent
  // In some cases the stream may mark itself as changed in order to perform further validation
  // Or follow up Elasticsearch changes based on a parent or child changing
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

  private async delete(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    const { cascadingChanges, changeStatus } = await this.doHandleDeleteChange(
      target,
      desiredState,
      startingState
    );
    this._changeStatus = changeStatus;

    return cascadingChanges;
  }

  private async upsert(
    definition: Streams.all.Definition,
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

  // The validate method should have the stream consider, that given this desired state
  // Is the stream in a valid state (also based on the state of its parent and children)
  // And depending on if the stream was deleted or changed
  async validate(desiredState: State, startingState: State): Promise<ValidationResult> {
    try {
      if (this._changeStatus === 'upserted') {
        return await this.doValidateUpsertion(desiredState, startingState);
      } else if (this._changeStatus === 'deleted') {
        return await this.doValidateDeletion(desiredState, startingState);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error : new Error(String(error))],
      };
    }
  }

  // If the stream has changed, what actions are needed to change the Elasticsearch
  // resources to match the desired state?
  // If the stream as newly created or deleted we expect all the actions that are needed to
  // create or delete the required resources
  // If the stream was changed, we aim to only update those resources that would be impacted by
  // that particular type of change
  async determineElasticsearchActions(
    desiredState: State,
    startingState: State,
    startingStateStream?: StreamActiveRecord<TDefinition>
  ): Promise<ElasticsearchAction[]> {
    if (this.changeStatus === 'upserted') {
      if (startingStateStream) {
        return this.doDetermineUpdateActions(desiredState, startingState, startingStateStream);
      } else {
        return this.doDetermineCreateActions(desiredState);
      }
    } else if (this.changeStatus === 'deleted') {
      return this.doDetermineDeleteActions();
    }

    throw new Error('Cannot determine Elasticsearch actions for an unchanged stream');
  }

  toPrintable(): PrintableStream {
    return {
      changeStatus: this.changeStatus,
      changes: this.getChanges(),
      definition: this.definition,
    };
  }

  clone(): StreamActiveRecord<TDefinition> {
    // Get a copy of the current definition
    const clonedStream = this.doClone();
    // Carry over any changes not included in the definition
    clonedStream.setChanges(this.getChanges());
    return clonedStream;
  }

  getChanges(): StreamChanges {
    return this._changes;
  }

  setChanges(changes: StreamChanges) {
    this._changes = { ...changes };
  }

  protected abstract doClone(): StreamActiveRecord<TDefinition>;

  protected abstract doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }>;

  protected abstract doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }>;

  protected abstract doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult>;

  protected abstract doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult>;

  protected abstract doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]>;
  protected abstract doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: StreamActiveRecord<TDefinition>
  ): Promise<ElasticsearchAction[]>;
  protected abstract doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
}
