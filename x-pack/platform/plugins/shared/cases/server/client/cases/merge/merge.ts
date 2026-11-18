/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MergeCasesRequest, MergeCasesResponse } from '../../../../common/types/api';
import { MergeCasesRequestSchema, MergeCasesResponseSchema } from '../../../../common/types/api';
import type { Case, MergePayload, MergeUpdatedField } from '../../../../common/types/domain';
import { CaseStatuses, UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { Operations } from '../../../authorization';
import { createCaseError } from '../../../common/error';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../../common/runtime_types';
import type { CasesClient } from '../../client';
import type { CasesClientArgs } from '../../types';
import type { MergeContext } from './context';
import { loadMergeContext } from './context';
import { throwIfMergeBlocked } from './errors';
import type { MergeRun, SourceResult } from './steps';
import {
  addNote,
  closeSource,
  copySource,
  createDestination,
  getRemainingRoom,
  linkSource,
  recordFailure,
  relinkDestinationAlerts,
  updateDestination,
} from './steps';

const snapshot = ({ id, title, incremental_id: incrementalId }: Case) => ({
  id,
  title,
  incrementalId: incrementalId ?? null,
});

const toSourcePayload = ({ source, copied, existing, leftOut, linked, closed }: SourceResult) => ({
  ...snapshot(source),
  outcome: linked ? ('merged' as const) : ('notMerged' as const),
  closed,
  copied,
  existing,
  leftOut,
});

/**
 * Merges cases into a new case or into an open one of them. Every check runs before the first
 * write, so a refused merge changes nothing. Then it writes the destination, copies each source's
 * items, links each source whose items were all copied, closes the linked sources if asked, and
 * records the merge. A failed write after the destination exists is reported per source and in
 * `failures`, and is never rolled back: running the same merge again finishes it.
 */
export const merge = async (
  params: MergeCasesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<MergeCasesResponse> => {
  const {
    logger,
    user,
    authorization,
    services: { userActionService },
  } = clientArgs;

  let request: MergeCasesRequest;
  let context: MergeContext;
  let destinationCase: Case;
  let updatedFields: MergeUpdatedField[];
  let runClientArgs: CasesClientArgs;

  try {
    request = decodeWithExcessOrThrowZod(MergeCasesRequestSchema)(params);
    context = await loadMergeContext(request, clientArgs, casesClient);

    await authorization.ensureAuthorized({
      entities: context.orderedCases.map(({ id, owner }) => ({ id, owner })),
      operation: [
        ...(context.destination == null ? [Operations.createCase] : []),
        Operations.updateCase,
        Operations.createComment,
      ],
    });

    if (request.fields?.assignees !== undefined && !context.canChangeAssignees) {
      throw Boom.forbidden(
        'Assigning users needs the assign privilege and an Elastic Platinum license.'
      );
    }

    throwIfMergeBlocked(context);

    const sourceCaseIds = context.sources.map(({ id }) => id);
    runClientArgs = {
      ...clientArgs,
      mergeContext: { sourceCaseIds, destinationCaseId: context.destination?.id },
    };

    if (context.destination == null) {
      destinationCase = await createDestination(
        context,
        request.fields?.assignees !== undefined,
        runClientArgs,
        casesClient
      );
      updatedFields = [];
      runClientArgs = {
        ...runClientArgs,
        mergeContext: { sourceCaseIds, destinationCaseId: destinationCase.id },
      };
    } else {
      ({ destinationCase, updatedFields } = await updateDestination(
        context,
        context.destination,
        runClientArgs,
        casesClient
      ));
    }
  } catch (error) {
    throw createCaseError({
      message: `Failed to merge cases [${(params.caseIds ?? []).join(', ')}]: ${error}`,
      error,
      logger,
    });
  }

  const { owner, sources, plan } = context;
  const run: MergeRun = {
    destinationId: destinationCase.id,
    clientArgs: runClientArgs,
    casesClient,
    failures: [],
  };

  await relinkDestinationAlerts(context.missingDestinationAlerts, run);

  // Copy every source, oldest first; a failed write doesn't stop the next source.
  const results: SourceResult[] = [];
  for (const [position, source] of sources.entries()) {
    results.push(await copySource(plan.sources[position], source, run));
  }

  // Link only sources whose items were all copied, so a source never links without its content.
  const room = getRemainingRoom(plan);
  for (const [position, result] of results.entries()) {
    if (result.complete) {
      try {
        result.linked = await linkSource(result, plan.sources[position], context, run, room);
      } catch (error) {
        recordFailure(run, 'mark', result.source.id, error);
      }
    }
  }

  if (request.closeSources !== false) {
    for (const result of results) {
      if (result.linked && result.source.status !== CaseStatuses.closed) {
        result.closed = await closeSource(result.source.id, run);
      }
    }
  }

  const linkedResults = results.filter(({ linked }) => linked);
  const payload: { merge: MergePayload } = {
    merge: {
      destination: snapshot(destinationCase),
      sources: results.map(toSourcePayload),
      updatedFields,
      notCopiedFields: context.fields.fields.notCopiedFields.map(({ key, label }) => ({
        key,
        label,
      })),
    },
  };

  try {
    await userActionService.creator.bulkCreateUserAction({
      userActions: [destinationCase.id, ...linkedResults.map(({ source }) => source.id)].map(
        (caseId) => ({
          type: UserActionTypes.merge,
          action: UserActionActions.update,
          caseId,
          owner,
          user,
          payload,
        })
      ),
      throwOnItemError: true,
      refresh: 'wait_for',
    });
  } catch (error) {
    recordFailure(run, 'activity', destinationCase.id, error);
  }

  if (request.note != null) {
    await addNote(request.note, owner, run);
  }

  userActionService.creator.auditLogMerge({
    destinationId: destinationCase.id,
    sourceIds: linkedResults.map(({ source }) => source.id),
  });

  return decodeOrThrowZod(MergeCasesResponseSchema)({
    destination: {
      ...snapshot(destinationCase),
      isNew: context.destination == null,
    },
    sources: results.map(({ source, ...result }) => {
      const { id, ...sourcePayload } = toSourcePayload({ source, ...result });
      return { caseId: id, ...sourcePayload };
    }),
    failures: run.failures,
  });
};
