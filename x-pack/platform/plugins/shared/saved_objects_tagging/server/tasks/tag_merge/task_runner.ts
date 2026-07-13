/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  SavedObjectsClientContract,
  ISavedObjectTypeRegistry,
} from '@kbn/core/server';
import { isSavedObjectErrorResult, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RunContext, TaskRunCreatorFunction } from '@kbn/task-manager-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { taggableTypes } from '../../../common/constants';
import { tagIdToReference } from '../../../common/references';
import { computeAffectedCount, rewriteTagReferences, TagsClient } from '../../services';
import {
  TAG_MERGE_BATCH_SIZE,
  TAG_MERGE_MAX_ERROR_SAMPLES,
  TAG_MERGE_RESCHEDULE_DELAY_MS,
} from './constants';
import type { TagMergeTaskParams, TagMergeTaskState } from './schemas';

interface PhaseArgs {
  soClient: SavedObjectsClientContract;
  internalClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  params: TagMergeTaskParams;
  state: TagMergeTaskState;
  knownTaggableTypes: string[];
  abortController: AbortController;
}

const addErrorSamples = (
  errors: TagMergeTaskState['errors'],
  messages: string[]
): TagMergeTaskState['errors'] => ({
  count: errors.count + messages.length,
  samples: [...errors.samples, ...messages].slice(0, TAG_MERGE_MAX_ERROR_SAMPLES),
});

const runScanningPhase = async ({ soClient, params, state, knownTaggableTypes }: PhaseArgs) => {
  const { affectedCount } = await computeAffectedCount(soClient, {
    fromIds: params.fromIds,
    types: knownTaggableTypes,
  });

  return {
    state: { ...state, totalAffected: affectedCount, phase: 'updating' as const },
    runAt: new Date(Date.now() + TAG_MERGE_RESCHEDULE_DELAY_MS),
  };
};

const runUpdatingPhase = async ({ soClient, params, state, knownTaggableTypes }: PhaseArgs) => {
  const { toId, fromIds } = params;
  const hasReference = fromIds.map(tagIdToReference);

  const { saved_objects: batch } = await soClient.find({
    type: knownTaggableTypes,
    hasReference,
    hasReferenceOperator: 'OR',
    perPage: TAG_MERGE_BATCH_SIZE,
  });

  if (batch.length === 0) {
    const nextPhase = params.deleteSources ? ('finalizing' as const) : ('complete' as const);
    return {
      state: {
        ...state,
        phase: nextPhase,
        status: nextPhase === 'complete' ? ('success' as const) : state.status,
      },
      runAt: new Date(Date.now() + TAG_MERGE_RESCHEDULE_DELAY_MS),
    };
  }

  const updates = rewriteTagReferences(batch, { toId, fromIds });
  const result = await soClient.bulkUpdate(updates);
  const failures = result.saved_objects.filter(isSavedObjectErrorResult);
  const succeeded = batch.length - failures.length;

  const nextState: TagMergeTaskState = {
    ...state,
    updatedCount: state.updatedCount + succeeded,
    errors: addErrorSamples(
      state.errors,
      failures.map((f) => `[${f.type}/${f.id}] ${f.error!.message}`)
    ),
  };

  // Cancellation is handled by `run()`'s top-level guard before the next batch starts, not here.
  return { state: nextState, runAt: new Date(Date.now() + TAG_MERGE_RESCHEDULE_DELAY_MS) };
};

const runFinalizingPhase = async ({
  soClient,
  internalClient,
  params,
  state,
  knownTaggableTypes,
  abortController,
}: PhaseArgs) => {
  const { fromIds } = params;
  const tagsClient = new TagsClient({ client: soClient });

  // Sequential (not Promise.all): each iteration checks the abort signal, so a timeout stops
  // deleting further source tags immediately rather than firing all deletes concurrently.
  const deletion: TagMergeTaskState['deletion'] = [];
  for (const id of fromIds) {
    if (abortController.signal.aborted) break;

    // Deliberately the unscoped `internalClient`, not the per-user `soClient`: a per-user
    // `find()` silently narrows to types the merging user can `find` rather than throwing on
    // the rest, so this safety check would otherwise under-count real remaining references (and
    // delete a source tag still in use) whenever the merging user can't see every taggable type.
    const { total } = await internalClient.find({
      type: knownTaggableTypes,
      hasReference: [tagIdToReference(id)],
      perPage: 0,
    });
    if (total > 0) {
      deletion.push({ id, deleted: false, remainingReferences: total });
      continue;
    }
    try {
      await tagsClient.delete(id);
      deletion.push({ id, deleted: true });
    } catch (e) {
      // a re-run (e.g. after an abort below) may re-delete an id already removed on a prior run.
      deletion.push(
        SavedObjectsErrorHelpers.isNotFoundError(e)
          ? { id, deleted: true }
          : { id, deleted: false, error: e.message }
      );
    }
  }

  if (abortController.signal.aborted) {
    // partial progress only; re-run `finalizing` from scratch (idempotent) to cover the rest.
    return {
      state: { ...state, deletion },
      runAt: new Date(Date.now() + TAG_MERGE_RESCHEDULE_DELAY_MS),
    };
  }

  return {
    state: { ...state, phase: 'complete' as const, status: 'success' as const, deletion },
    // See the top-level guard's comment: a terminal state returned without `runAt` is never
    // persisted at all (Task Manager deletes the task instead), so this still needs one.
    runAt: new Date(Date.now() + TAG_MERGE_RESCHEDULE_DELAY_MS),
  };
};

export const createTagMergeTaskRunner =
  (getCoreStart: () => Promise<CoreStart>): TaskRunCreatorFunction =>
  (context: RunContext) => {
    const { taskInstance, fakeRequest, abortController } = context;

    return {
      run: async () => {
        const params = taskInstance.params as TagMergeTaskParams;
        const state = taskInstance.state as TagMergeTaskState;

        if (!fakeRequest) {
          throwUnrecoverableError(
            new Error(
              'Tag merge task is missing its scoped request: no apiKey/userScope was set when it was scheduled'
            )
          );
        }

        // Cooperative cancellation: checked at the start of every run, before doing more work.
        //
        // `runAt` here is required, not optional: a one-shot task (no `schedule`) that returns
        // WITHOUT `runAt` is treated by Task Manager as finished and its saved object is deleted
        // immediately (`processResultWhenDone`, task_manager's task_runner.ts) — the returned
        // `state` is never written first. Omitting `runAt` on a terminal-state transition means
        // that state (`canceled`, here) is silently thrown away, and the next status poll finds
        // no task at all and falls back to reporting `idle`. The one further no-op run this
        // causes (hitting the `case 'complete'` branch below, which correctly has no `runAt`)
        // is what actually triggers cleanup, once the terminal state has had a chance to persist
        // and be observed.
        if (state.cancelRequested && state.status === 'in_progress') {
          return {
            state: { ...state, status: 'canceled' as const, phase: 'complete' as const },
            runAt: new Date(Date.now() + TAG_MERGE_RESCHEDULE_DELAY_MS),
          };
        }

        // Already timed out before this run got a chance to start any work: retry shortly
        // rather than returning without `runAt`, which (per the comment above) would get this
        // task deleted outright — a transient abort here isn't a terminal state.
        if (abortController.signal.aborted) {
          return { state, runAt: new Date(Date.now() + TAG_MERGE_RESCHEDULE_DELAY_MS) };
        }

        const core = await getCoreStart();
        const soClient = core.savedObjects.getScopedClient(fakeRequest!);
        const internalClient = core.savedObjects.getUnsafeInternalClient();
        const typeRegistry = core.savedObjects.getTypeRegistry();
        const knownTaggableTypes = taggableTypes.filter(
          (type) => typeRegistry.getType(type) !== undefined
        );
        const phaseArgs: PhaseArgs = {
          soClient,
          internalClient,
          typeRegistry,
          params,
          state,
          knownTaggableTypes,
          abortController,
        };

        switch (state.phase) {
          case 'scanning':
            return runScanningPhase(phaseArgs);
          case 'updating':
            return runUpdatingPhase(phaseArgs);
          case 'finalizing':
            return runFinalizingPhase(phaseArgs);
          case 'complete':
          default:
            // No `runAt`: this is the no-op run that lets Task Manager clean up the task,
            // now that the terminal state set on the previous run has had a chance to persist.
            return { state };
        }
      },
    };
  };
