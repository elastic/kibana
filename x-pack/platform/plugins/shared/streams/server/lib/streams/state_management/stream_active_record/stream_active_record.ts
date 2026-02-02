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

// Type for pending resource actions that will be executed
export type PendingResourceAction = Exclude<StreamChange, { type: 'upsert' } | { type: 'delete' }>;

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
  protected _pendingResourceActions: PendingResourceAction[] = [];

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
    return this.changeStatus !== 'unchanged' || this.hasPendingResourceActions();
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
    switch (change.type) {
      case 'delete':
        return this.delete(change.name, desiredState, startingState);
      case 'upsert':
        return this.upsert(change.definition, desiredState, startingState);
      case 'link_attachment':
      case 'unlink_attachment':
      case 'upsert_query':
      case 'delete_query':
      case 'upsert_feature':
      case 'delete_feature':
        return this.handleResourceChange(change, desiredState, startingState);
      default:
        // Exhaustive check - TypeScript will error if we miss a case
        const _exhaustiveCheck: never = change;
        throw new Error(`Unknown change type: ${(_exhaustiveCheck as StreamChange).type}`);
    }
  }

  // Handle resource changes (attachments, queries, features)
  // These changes are stream-associated but not stream definition changes
  // They should only be handled by the target stream
  private async handleResourceChange(
    change: Exclude<StreamChange, { type: 'upsert' } | { type: 'delete' }>,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    // Only handle the change if it targets this stream
    if (change.name !== this._definition.name) {
      return [];
    }

    return this.doHandleResourceChange(change, desiredState, startingState);
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
      return { isValid: false, errors: [error] };
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
    const actions: ElasticsearchAction[] = [];

    // Add resource actions (attachments, queries, features)
    actions.push(...this.determineResourceActions());

    // Add stream-level actions based on change status
    if (this.changeStatus === 'upserted') {
      if (startingStateStream) {
        actions.push(
          ...(await this.doDetermineUpdateActions(desiredState, startingState, startingStateStream))
        );
      } else {
        actions.push(...(await this.doDetermineCreateActions(desiredState)));
      }
    } else if (this.changeStatus === 'deleted') {
      actions.push(...(await this.doDetermineDeleteActions()));
    } else if (!this.hasPendingResourceActions()) {
      throw new Error('Cannot determine Elasticsearch actions for an unchanged stream');
    }

    return actions;
  }

  // Convert pending resource changes to ElasticsearchActions
  private determineResourceActions(): ElasticsearchAction[] {
    return this._pendingResourceActions.map((change): ElasticsearchAction => {
      switch (change.type) {
        case 'link_attachment':
          return {
            type: 'link_attachment',
            request: { name: change.name, attachment: change.attachment },
          };
        case 'unlink_attachment':
          return {
            type: 'unlink_attachment',
            request: { name: change.name, attachment: change.attachment },
          };
        case 'upsert_query':
          return {
            type: 'upsert_query',
            request: { name: change.name, query: change.query },
          };
        case 'delete_query':
          return {
            type: 'delete_query',
            request: { name: change.name, queryId: change.queryId },
          };
        case 'upsert_feature':
          return {
            type: 'upsert_feature',
            request: { name: change.name, feature: change.feature },
          };
        case 'delete_feature':
          return {
            type: 'delete_feature',
            request: { name: change.name, featureId: change.featureId },
          };
        default:
          const _exhaustiveCheck: never = change;
          throw new Error(
            `Unknown resource change type: ${(_exhaustiveCheck as StreamChange).type}`
          );
      }
    });
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
    // Carry over pending resource actions
    clonedStream.setPendingResourceActions(this.getPendingResourceActions());
    return clonedStream;
  }

  getPendingResourceActions(): PendingResourceAction[] {
    return [...this._pendingResourceActions];
  }

  setPendingResourceActions(actions: PendingResourceAction[]) {
    this._pendingResourceActions = [...actions];
  }

  hasPendingResourceActions(): boolean {
    return this._pendingResourceActions.length > 0;
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

  // Handle resource-level changes (attachments, queries, features)
  protected abstract doHandleResourceChange(
    change: Exclude<StreamChange, { type: 'upsert' } | { type: 'delete' }>,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]>;
}
