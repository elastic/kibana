/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, intersection } from 'lodash';
import { StatusError } from '../errors/status_error';
import { FailedToApplyRequestedChangesError } from './errors/failed_to_apply_requested_changes_error';
import { FailedToDetermineElasticsearchActionsError } from './errors/failed_to_determine_elasticsearch_actions_error';
import { FailedToLoadCurrentStateError } from './errors/failed_to_load_current_state_error';
import { FailedToRollbackError } from './errors/failed_to_rollback_error';
import { InvalidStateError } from './errors/invalid_state_error';
import { ExecutionPlan } from './execution_plan/execution_plan';
import type { ActionsByType } from './execution_plan/types';
import type { StreamActiveRecord } from './streams/stream_active_record';
import { streamFromDefinition } from './streams/stream_from_definition';
import type { StateDependencies, StreamChange } from './types';

interface Changes {
  created: string[];
  updated: string[];
  deleted: string[];
}

interface ValidDryRunResult {
  status: 'valid_dry_run';
  changes: Changes;
  elasticsearchActions: ActionsByType;
}

type AttemptChangesResult =
  | ValidDryRunResult
  | { status: 'success'; changes: Changes }
  | { status: 'failed_with_rollback'; error: any };

export class State {
  private streamsByName: Map<string, StreamActiveRecord>;
  private dependencies: StateDependencies;

  // Usage of State should only happen via static State.attemptChanges
  private constructor(streams: StreamActiveRecord[], dependencies: StateDependencies) {
    this.streamsByName = new Map();
    streams.forEach((stream) => this.streamsByName.set(stream.definition.name, stream));
    this.dependencies = dependencies;
  }

  static async attemptChanges(
    requestedChanges: StreamChange[],
    dependencies: StateDependencies,
    dryRun: boolean = false
  ): Promise<AttemptChangesResult> {
    const startingState = await State.currentState(dependencies);
    const desiredState = await startingState.applyChanges(requestedChanges);
    await desiredState.validate(startingState);

    if (dryRun) {
      const changes = desiredState.changes(startingState);
      // Do we always want to include/expose the Elasticsearch actions?
      const elasticsearchActions = await desiredState.plannedActions(startingState);
      return {
        status: 'valid_dry_run',
        changes,
        elasticsearchActions,
      };
    } else {
      try {
        await desiredState.commitChanges(startingState);
        return { status: 'success', changes: desiredState.changes(startingState) };
      } catch (error) {
        await desiredState.attemptRollback(startingState, error);
        return {
          status: 'failed_with_rollback',
          error: new StatusError(
            `Failed to apply changes but successfully rolled back to previous state: ${error.message}`,
            error.statusCode ?? 500
          ),
        };
      }
    }
  }

  static async resync(dependencies: StateDependencies) {
    const currentState = await State.currentState(dependencies);
    currentState.all().map((stream) => stream.markAsCreated());
    // This way all current streams will look like they have been added
    const emptyState = new State([], dependencies);
    await currentState.commitChanges(emptyState);
  }

  static async currentState(dependencies: StateDependencies): Promise<State> {
    try {
      const streamsSearchResponse = await dependencies.storageClient.search({
        size: 10000, // Paginate if there are more...
        sort: [{ name: 'asc' }],
        track_total_hits: false,
      });

      const streams = streamsSearchResponse.hits.hits.map(({ _source: definition }) =>
        streamFromDefinition(definition, dependencies)
      );

      return new State(streams, dependencies);
    } catch (error) {
      throw new FailedToLoadCurrentStateError(
        `Failed to load current Streams state: ${error.message}`
      );
    }
  }

  async applyChanges(requestedChanges: StreamChange[]): Promise<State> {
    try {
      const desiredState = this.clone();

      for (const requestedChange of requestedChanges) {
        // Apply one change and any cascading changes from that change
        await this.applyRequestedChange(requestedChange, desiredState, this);
      }

      return desiredState;
    } catch (error) {
      throw new FailedToApplyRequestedChangesError(
        `Failed to apply requested changes to Stream state: ${[error.message]}`,
        error.statusCode
      );
    }
  }

  clone(): State {
    const newStreams = this.all().map((stream) => stream.clone());
    return new State(newStreams, this.dependencies);
  }

  async applyRequestedChange(
    requestedChange: StreamChange,
    desiredState: State,
    startingState: State
  ) {
    const cascadingChanges = await this.applyChange(requestedChange, desiredState, startingState);
    await this.applyCascadingChanges(cascadingChanges, desiredState, startingState);
  }

  async applyCascadingChanges(
    cascadingChanges: StreamChange[],
    desiredState: State,
    startingState: State
  ) {
    let iterationCounter = 0;
    let currentCascadingChanges: StreamChange[] = [...cascadingChanges];

    while (currentCascadingChanges.length !== 0) {
      const newCascadingChanges: StreamChange[] = [];
      for (const cascadingChange of currentCascadingChanges) {
        const newChanges = await this.applyChange(cascadingChange, desiredState, startingState);
        newCascadingChanges.push(...newChanges);
      }
      currentCascadingChanges = newCascadingChanges;
      if (++iterationCounter > 100) {
        throw new Error('Excessive cascading changes');
      }
    }
  }

  async applyChange(
    change: StreamChange,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (change.type !== 'delete' && !desiredState.has(change.definition.name)) {
      const newStream = streamFromDefinition(change.definition, this.dependencies);
      desiredState.set(newStream.definition.name, newStream);
    }

    const cascadingChanges: StreamChange[][] = [];
    for (const stream of desiredState.all()) {
      const newChanges = await stream.applyChange(change, desiredState, startingState);
      cascadingChanges.push(newChanges);
    }
    return cascadingChanges.flat();
  }

  async validate(startingState: State): Promise<void> {
    const validationResults = await Promise.all(
      this.all().map((stream) => stream.validate(this, startingState))
    );

    const isValid = validationResults.every((validationResult) => validationResult.isValid);
    const errors = validationResults.flatMap((validationResult) => validationResult.errors);

    if (!isValid) {
      throw new InvalidStateError(`Desired stream state is invalid: ${errors.join(', ')}`);
    }
  }

  changedStreams() {
    return this.all().filter((stream) => stream.hasChanged());
  }

  async plannedActions(startingState: State) {
    const executionPlan = new ExecutionPlan(this.dependencies);
    await executionPlan.plan(
      await this.determineElasticsearchActions(this.changedStreams(), this, startingState)
    );
    return executionPlan.plannedActions();
  }

  async commitChanges(startingState: State) {
    const executionPlan = new ExecutionPlan(this.dependencies);
    await executionPlan.plan(
      await this.determineElasticsearchActions(this.changedStreams(), this, startingState)
    );
    await executionPlan.execute();
  }

  async attemptRollback(startingState: State, originalError: any) {
    try {
      const rollbackTargets = this.changedStreams().map((stream) => {
        if (startingState.has(stream.definition.name)) {
          const changedStreamToRevert = stream.clone();
          changedStreamToRevert.markAsCreated();
          return changedStreamToRevert;
        } else {
          const createdStreamToCleanUp = stream.clone();
          createdStreamToCleanUp.markAsDeleted();
          return createdStreamToCleanUp;
        }
      });

      const executionPlan = new ExecutionPlan(this.dependencies);
      await executionPlan.plan(
        await this.determineElasticsearchActions(rollbackTargets, startingState, this)
      );
      await executionPlan.execute();
    } catch (error) {
      throw new FailedToRollbackError(
        `Failed to rollback attempted changes: ${error.message}. Original error: ${originalError}`
      );
    }
  }

  async determineElasticsearchActions(
    changedStreams: StreamActiveRecord[],
    desiredState: State,
    startingState: State
  ) {
    try {
      const actions = await Promise.all(
        changedStreams.map((stream) =>
          stream.determineElasticsearchActions(
            desiredState,
            startingState,
            startingState.get(stream.definition.name)
          )
        )
      );
      return actions.flat();
    } catch (error) {
      throw new FailedToDetermineElasticsearchActionsError(
        `Failed to determine Elasticsearch actions: ${error.message}`
      );
    }
  }

  // Should this include the definitions, or are the names enough?
  changes(startingState: State): Changes {
    const startingStreams = startingState.all().map((stream) => stream.definition.name);
    const desiredStreams = this.all().map((stream) => stream.definition.name);

    const deleted = difference(startingStreams, desiredStreams);
    const created = difference(desiredStreams, startingStreams);
    const updated = intersection(startingStreams, desiredStreams);

    return {
      created,
      updated,
      deleted,
    };
  }

  get(name: string) {
    return this.streamsByName.get(name);
  }

  set(name: string, stream: StreamActiveRecord) {
    this.streamsByName.set(name, stream);
  }

  all() {
    return Array.from(this.streamsByName.values());
  }

  has(name: string) {
    return this.streamsByName.has(name);
  }
}
