/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, intersection, isEqual } from 'lodash';
import { isLockAcquisitionError } from '@kbn/lock-manager';
import { FailedToApplyRequestedChangesError } from './errors/failed_to_apply_requested_changes_error';
import { FailedToDetermineElasticsearchActionsError } from './errors/failed_to_determine_elasticsearch_actions_error';
import { FailedToLoadCurrentStateError } from './errors/failed_to_load_current_state_error';
import { FailedToChangeStateError } from './errors/failed_to_change_state_error';
import { InvalidStateError } from './errors/invalid_state_error';
import { ExecutionPlan } from './execution_plan/execution_plan';
import type { ActionsByType } from './execution_plan/types';
import type {
  PrintableStream,
  StreamActiveRecord,
} from './stream_active_record/stream_active_record';
import { streamFromDefinition } from './stream_active_record/stream_from_definition';
import type { StateDependencies, StreamChange } from './types';
import { ConcurrentAccessError } from './errors/concurrent_access_error';
import { InsufficientPermissionsError } from '../errors/insufficient_permissions_error';
import { getErrorMessage } from '../errors/parse_error';
import { StatusError } from '../errors/status_error';

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

type AttemptChangesResult = ValidDryRunResult | { status: 'success'; changes: Changes };

/**
 * The State class is responsible for moving from the current state to the desired state
 * Based on the requested bulk changes. It follows the following phases to achieve this:
 * 1. Load the current state by reading all the stored Stream definitions
 * 2. Applying the requested changes to a clone of the current state (by showing the change to each Stream instance)
 * 3. Applying cascading changes that the Stream instances return in response to a requested change
 * 4. Validating the desired state by asking each Stream if it is valid in this state
 * 5. If the state is valid, State asks each Stream to determine the required Elasticsearch actions needed to reach the desired state
 * 6. If it is a dry run, it returns the affected streams and the Elasticsearch actions that would have happened
 * 7. If it is a real run, it commits the changes by updating the various Elasticsearch resources (delegated to the ExecutionPlan class)
 * 8. If this fails, it throws an error and guides the user to use resync if needed
 */
export class State {
  private streamsByName: Map<string, StreamActiveRecord>;
  private dependencies: StateDependencies;

  // Changes to state should only happen via static State.attemptChanges or  State.resync
  // State.currentState can be used to simply read the state
  private constructor(streams: StreamActiveRecord[], dependencies: StateDependencies) {
    this.streamsByName = new Map();
    streams.forEach((stream) => this.streamsByName.set(stream.definition.name, stream));
    this.dependencies = dependencies;
  }

  clone(): State {
    const newStreams = this.all().map((stream) => stream.clone());
    return new State(newStreams, this.dependencies);
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
      const lmService = dependencies.lockManager;
      return lmService
        .withLock('streams/apply_changes', async () => {
          try {
            await desiredState.commitChanges(startingState);
            return { status: 'success' as const, changes: desiredState.changes(startingState) };
          } catch (error) {
            if (error instanceof InsufficientPermissionsError) {
              throw error;
            }
            throw new FailedToChangeStateError(
              `Failed to change state: ${getErrorMessage(
                error
              )}. The stream state may be inconsistent. Revert your last change, or use the resync API to restore a consistent state.`,
              error instanceof StatusError ? error.statusCode : 500
            );
          }
        })
        .catch((error) => {
          if (isLockAcquisitionError(error)) {
            throw new ConcurrentAccessError('Could not acquire lock for applying changes');
          }
          throw error;
        });
    }
  }

  static async resync(dependencies: StateDependencies) {
    const currentState = await State.currentState(dependencies);

    // This way all current streams will look like they have been added
    currentState.all().map((stream) => stream.markAsUpserted());
    const emptyState = new State([], dependencies);

    // We skip validation since we assume the stored state to be correct
    await currentState.commitChanges(emptyState);
  }

  static async currentState(dependencies: StateDependencies): Promise<State> {
    try {
      const streamsSearchResponse = await dependencies.storageClient.search({
        size: 10000,
        sort: [{ name: 'asc' }],
        track_total_hits: false,
      });

      const streams = streamsSearchResponse.hits.hits
        .filter(({ _source: definition }) => !('group' in definition)) // Filter out old Group streams
        .map(({ _source: definition }) => streamFromDefinition(definition, dependencies));

      return new State(streams, dependencies);
    } catch (error) {
      throw new FailedToLoadCurrentStateError(
        `Failed to load current Streams state: ${getErrorMessage(error)}`
      );
    }
  }

  async applyChanges(requestedChanges: StreamChange[]): Promise<State> {
    try {
      const desiredState = this.clone();

      let checkingState;
      if (this.dependencies.isDev) {
        checkingState = this.clone();
      }

      for (const requestedChange of requestedChanges) {
        // Apply one change and any cascading changes from that change
        await this.applyRequestedChange(requestedChange, desiredState, this);
      }

      if (this.dependencies.isDev) {
        if (!isEqual(this.toPrintable(), checkingState!.toPrintable())) {
          throw new Error('applyChanges resulted in the starting state being modified');
        }
      }

      return desiredState;
    } catch (error) {
      throw new FailedToApplyRequestedChangesError(
        `Failed to apply requested changes to Stream state: ${getErrorMessage(error)}`,
        error instanceof StatusError ? error.statusCode : 500
      );
    }
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
    // Add new streams if they haven't already been added by a previous (cascading) change
    if (change.type === 'upsert' && !desiredState.has(change.definition.name)) {
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
      throw new InvalidStateError(errors, `Desired stream state is invalid`);
    }
  }

  async commitChanges(startingState: State) {
    const executionPlan = new ExecutionPlan(this.dependencies);
    await executionPlan.plan(
      await this.determineElasticsearchActions(this.changedStreams(), this, startingState)
    );
    await executionPlan.execute();
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
        `Failed to determine Elasticsearch actions: ${getErrorMessage(error)}`
      );
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

  toPrintable(): Record<string, PrintableStream> {
    // Drop all references to the dependencies since they cannot be JSON.stringified
    return Object.fromEntries(
      Array.from(this.streamsByName).map(([key, stream]) => [key, stream.toPrintable()])
    );
  }
}
