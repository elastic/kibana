/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual, pickBy, uniq } from 'lodash';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../../common/constants';
import type {
  CasePatchRequest,
  MergeCasesRequest,
  MergeCasesResponse,
  MergeFailureStep,
} from '../../../../common/types/api';
import { MergeCasesRequestSchema, MergeCasesResponseSchema } from '../../../../common/types/api';
import type {
  Case,
  MergeCopiedTotals,
  MergePayload,
  MergeUpdatedField,
} from '../../../../common/types/domain';
import { CaseStatuses, UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { MergeUpdatedFieldSchema } from '../../../../common/types/domain/user_action/merge/v1';
import { getCaseSettings } from '../../../../common/utils/case_settings';
import { getNoneConnector } from '../../../../common/utils/connectors';
import { Operations } from '../../../authorization';
import { createCaseError, isSOError } from '../../../common/error';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../../common/runtime_types';
import type { CaseSavedObjectTransformed } from '../../../common/types/case';
import type { CasesClient } from '../../client';
import type { CasesClientArgs } from '../../types';
import { bulkCreate as bulkCreateAttachments } from '../../attachments/bulk_create';
import { bulkUpdate } from '../bulk_update';
import { bulkAddObservables } from '../observables';
import type { MergeContext } from './context';
import { loadMergeContext } from './context';
import type { MergeAttachmentPlan } from './utils';
import { chunkItems, combineCustomFields, emptyCopiedTotals } from './utils';

type MergeFailure = MergeCasesResponse['failures'][number];

const throwIfOverLimit = ({ summaries }: MergeAttachmentPlan) => {
  for (const [kind, { overLimit, max }] of Object.entries(summaries)) {
    if (overLimit > 0) {
      throw Boom.badRequest(
        `Merging these cases exceeds the limit of ${max} ${kind} per case by ${overLimit}.`
      );
    }
  }
};

const createDestination = async (
  { fields }: MergeCasesRequest,
  { orderedCases, owner }: MergeContext,
  casesClient: CasesClient
): Promise<Case> => {
  const configurations = await casesClient.configure.get({ owner });
  const configuredKeys = new Set(
    configurations.flatMap(({ customFields }) => customFields.map(({ key }) => key))
  );
  const { syncAlerts } = getCaseSettings(owner);

  return casesClient.cases.create({
    title: fields.title,
    description: fields.description,
    tags: fields.tags,
    severity: fields.severity,
    category: fields.category ?? null,
    ...(fields.assignees != null ? { assignees: fields.assignees } : {}),
    owner,
    connector: getNoneConnector(),
    settings: { syncAlerts },
    customFields: combineCustomFields(orderedCases, configuredKeys),
  });
};

interface UpdatedDestination {
  destinationCase: Case;
  updatedFields: MergeUpdatedField[];
}

/** Updates the changed fields without their own activity entries; the merge entry lists them. */
const updateDestination = async (
  { fields }: MergeCasesRequest,
  destination: Case,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<UpdatedDestination> => {
  const sortedUids = (assignees: Array<{ uid: string }>) => assignees.map(({ uid }) => uid).sort();
  const changes = pickBy(
    {
      title: fields.title !== destination.title ? fields.title : undefined,
      description: fields.description !== destination.description ? fields.description : undefined,
      severity: fields.severity !== destination.severity ? fields.severity : undefined,
      category:
        (fields.category ?? null) !== (destination.category ?? null)
          ? fields.category ?? null
          : undefined,
      tags: !isEqual([...fields.tags].sort(), [...destination.tags].sort())
        ? fields.tags
        : undefined,
      assignees:
        fields.assignees != null &&
        !isEqual(sortedUids(fields.assignees), sortedUids(destination.assignees))
          ? fields.assignees
          : undefined,
    },
    (value) => value !== undefined
  ) as Partial<CasePatchRequest>;

  const updatedFields = MergeUpdatedFieldSchema.options.filter(
    (field) => changes[field] !== undefined
  );
  if (updatedFields.length === 0) {
    return { destinationCase: destination, updatedFields };
  }

  const [updated] = await bulkUpdate(
    { cases: [{ id: destination.id, version: destination.version, ...changes }] },
    clientArgs,
    casesClient,
    { skipUserActions: true }
  );
  return { destinationCase: updated, updatedFields };
};

const sumCopied = (totals: Iterable<MergeCopiedTotals>): MergeCopiedTotals => {
  const sum = emptyCopiedTotals();
  for (const total of totals) {
    sum.alerts += total.alerts;
    sum.events += total.events;
    sum.observables += total.observables;
    sum.other += total.other;
  }
  return sum;
};

type RecordFailure = (step: MergeFailureStep, caseId: string | null, error: unknown) => void;

interface MergeStepArgs {
  destinationId: string;
  clientArgs: CasesClientArgs;
  casesClient: CasesClient;
  recordFailure: RecordFailure;
}

const addCopied = (
  copiedBySource: Map<string, MergeCopiedTotals>,
  sourceCaseId: string,
  kind: keyof MergeCopiedTotals,
  count: number
) => {
  const copied = copiedBySource.get(sourceCaseId);
  if (copied != null) {
    copied[kind] += count;
  }
};

const copyObservables = async (
  observables: MergeAttachmentPlan['observables'],
  copiedBySource: Map<string, MergeCopiedTotals>,
  { destinationId, clientArgs, casesClient, recordFailure }: MergeStepArgs
) => {
  if (observables.length === 0) {
    return;
  }

  try {
    await bulkAddObservables(
      {
        caseId: destinationId,
        observables: observables.map(({ observable: { typeKey, value, description } }) => ({
          typeKey,
          value,
          description,
        })),
      },
      clientArgs,
      casesClient,
      { skipUserAction: true }
    );
    for (const { sourceCaseId } of observables) {
      addCopied(copiedBySource, sourceCaseId, 'observables', 1);
    }
  } catch (error) {
    recordFailure('observables', null, error);
  }
};

/**
 * Copies the planned observables and attachments without their own user actions; the merge user
 * action records what was copied.
 */
const copyAttachments = async (
  { items, observables }: MergeAttachmentPlan,
  copiedBySource: Map<string, MergeCopiedTotals>,
  stepArgs: MergeStepArgs
) => {
  // Observables go first: copied alerts can extract the same observables, and `bulkAddObservables`
  // rejects a request that adds nothing new.
  await copyObservables(observables, copiedBySource, stepArgs);

  const { destinationId, clientArgs, recordFailure } = stepArgs;
  for (const chunk of chunkItems(items, MAX_BULK_CREATE_ATTACHMENTS)) {
    try {
      await bulkCreateAttachments(
        { caseId: destinationId, attachments: chunk.map(({ payload }) => payload) },
        clientArgs,
        { skipUserActions: true }
      );
      for (const { kind, sourceCaseId, itemCount } of chunk) {
        addCopied(copiedBySource, sourceCaseId, kind, itemCount);
      }
    } catch (error) {
      recordFailure('attachments', null, error);
    }
  }
};

/**
 * Adds the destination to `merged_into` on the originals and returns the version each one has
 * afterwards.
 */
const markOriginals = async (
  originals: Case[],
  { destinationId, clientArgs, recordFailure }: MergeStepArgs
): Promise<Map<string, string>> => {
  const {
    user,
    services: { caseService },
  } = clientArgs;
  const versionsAfterMark = new Map<string, string>();

  try {
    const { saved_objects: originalSavedObjects } = await caseService.getCases({
      caseIds: originals.map(({ id }) => id),
    });
    const updatedAt = new Date().toISOString();
    const marked = await caseService.patchCases({
      cases: originalSavedObjects
        .filter((so): so is CaseSavedObjectTransformed => !isSOError(so))
        .map((originalCase) => ({
          caseId: originalCase.id,
          originalCase,
          version: originalCase.version,
          updatedAttributes: {
            merged_into: uniq([...(originalCase.attributes.merged_into ?? []), destinationId]),
            updated_at: updatedAt,
            updated_by: user,
          },
        })),
      refresh: false,
    });

    for (const savedObject of marked.saved_objects) {
      if (isSavedObjectErrorResult(savedObject)) {
        recordFailure('mark', savedObject.id, savedObject.error.message);
      } else if (savedObject.version != null) {
        versionsAfterMark.set(savedObject.id, savedObject.version);
      }
    }
  } catch (error) {
    recordFailure('mark', null, error);
  }

  return versionsAfterMark;
};

/** Closes the marked originals that are still open, leaving their alerts' status alone. */
const closeOriginals = async (
  originals: Case[],
  versionsAfterMark: Map<string, string>,
  { clientArgs, casesClient, recordFailure }: MergeStepArgs
): Promise<string[]> => {
  const casesToClose = originals.flatMap(({ id, status }) => {
    const version = versionsAfterMark.get(id);
    return status !== CaseStatuses.closed && version != null
      ? [{ id, version, status: CaseStatuses.closed }]
      : [];
  });
  if (casesToClose.length === 0) {
    return [];
  }

  try {
    const closed = await bulkUpdate({ cases: casesToClose }, clientArgs, casesClient, {
      skipAlertSync: true,
    });
    return closed.map(({ id }) => id);
  } catch (error) {
    recordFailure('close', null, error);
    return [];
  }
};

const addNote = async (
  note: string,
  owner: string,
  { destinationId, casesClient, recordFailure }: MergeStepArgs
) => {
  try {
    await casesClient.attachments.add({
      caseId: destinationId,
      comment: { type: COMMENT_ATTACHMENT_TYPE, data: { content: note }, owner },
    });
  } catch (error) {
    recordFailure('note', destinationId, error);
  }
};

/**
 * Merges cases into a new case or into one of them. The destination is created or updated first;
 * if that fails nothing has changed. Later steps (copying attachments, marking and closing the
 * originals, activity entries, the note) are recorded in `failures` and never rolled back. A case
 * can be merged again, so its `merged_into` lists every destination.
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

  try {
    request = decodeWithExcessOrThrowZod(MergeCasesRequestSchema)(params);
    context = await loadMergeContext(request, casesClient);

    await authorization.ensureAuthorized({
      entities: context.orderedCases.map(({ id, owner }) => ({ id, owner })),
      operation: [
        ...(context.destination == null ? [Operations.createCase] : []),
        Operations.updateCase,
        Operations.createComment,
      ],
    });

    throwIfOverLimit(context.plan);

    ({ destinationCase, updatedFields } =
      context.destination == null
        ? {
            destinationCase: await createDestination(request, context, casesClient),
            updatedFields: [],
          }
        : await updateDestination(request, context.destination, clientArgs, casesClient));
  } catch (error) {
    throw createCaseError({
      message: `Failed to merge cases [${(params.caseIds ?? []).join(', ')}]: ${error}`,
      error,
      logger,
    });
  }

  const { orderedCases, owner, plan } = context;
  const destinationId = destinationCase.id;
  const originals = orderedCases.filter(({ id }) => id !== destinationId);
  const failures: MergeFailure[] = [];
  const stepArgs: MergeStepArgs = {
    destinationId,
    clientArgs,
    casesClient,
    recordFailure: (step, caseId, error) => {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ step, caseId, message });
      logger.warn(`Merging cases into case ${destinationId}: step "${step}" failed: ${message}`);
    },
  };

  const copiedBySource = new Map<string, MergeCopiedTotals>(
    originals.map(({ id }) => [id, emptyCopiedTotals()])
  );
  await copyAttachments(plan, copiedBySource, stepArgs);

  const versionsAfterMark = await markOriginals(originals, stepArgs);
  const mergedCaseIds = [...versionsAfterMark.keys()];
  const closedCaseIds = request.closeOriginals
    ? await closeOriginals(originals, versionsAfterMark, stepArgs)
    : [];

  const payload: { merge: MergePayload } = {
    merge: {
      destination: {
        id: destinationId,
        title: destinationCase.title,
        incrementalId: destinationCase.incremental_id ?? null,
      },
      sources: originals.map(({ id, title, incremental_id: incrementalId }) => ({
        id,
        title,
        incrementalId: incrementalId ?? null,
        copied: copiedBySource.get(id) ?? emptyCopiedTotals(),
        duplicates: plan.duplicatesBySource.get(id) ?? emptyCopiedTotals(),
        excluded: plan.excludedBySource.get(id) ?? emptyCopiedTotals(),
      })),
      closedSources: closedCaseIds.length > 0,
      updatedFields,
    },
  };

  try {
    await userActionService.creator.bulkCreateUserAction({
      userActions: [destinationId, ...mergedCaseIds].map((caseId) => ({
        type: UserActionTypes.merge,
        action: UserActionActions.update,
        caseId,
        owner,
        user,
        payload,
      })),
      throwOnItemError: true,
      refresh: 'wait_for',
    });
  } catch (error) {
    stepArgs.recordFailure('activity', null, error);
  }

  if (request.note != null) {
    await addNote(request.note, owner, stepArgs);
  }

  return decodeOrThrowZod(MergeCasesResponseSchema)({
    destination: {
      id: destinationId,
      title: destinationCase.title,
      incrementalId: destinationCase.incremental_id ?? null,
      isNew: context.destination == null,
    },
    mergedCaseIds,
    closedCaseIds,
    copied: sumCopied(copiedBySource.values()),
    failures,
  });
};
