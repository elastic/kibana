/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSavedObjectErrorResult } from '@kbn/core/server';
import { isEqual } from 'lodash';
import {
  MAX_ALERTS_PER_CASE,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_OBSERVABLES_PER_CASE,
} from '../../../../common/constants';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type {
  CasePatchRequest,
  MergeCasesResponse,
  MergeFailureStep,
} from '../../../../common/types/api';
import type { Case, MergeCounts, MergeUpdatedField } from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import { getCaseSettings } from '../../../../common/utils/case_settings';
import type { AlertInfo } from '../../../common/types';
import type { CasesClient } from '../../client';
import type { CasesClientArgs } from '../../types';
import { addComment } from '../../attachments/add';
import { bulkCreate as bulkCreateAttachments } from '../../attachments/bulk_create';
import { bulkUpdate } from '../bulk_update';
import { create } from '../create';
import { bulkAddObservables } from '../observables';
import type { MergeAttachmentPlan, MergeCopyItem, MergeSourcePlan } from './attachments';
import { chunkItems, emptyCounts, planGainedItems } from './attachments';
import type { MergeContext } from './context';

type MergeFailure = MergeCasesResponse['failures'][number];
type Observable = Case['observables'][number];

/** What every write step shares: who writes, where, and where failures go. */
export interface MergeRun {
  destinationId: string;
  /** Client args carrying the merge context, so the triggers the writes fire say so. */
  clientArgs: CasesClientArgs;
  casesClient: CasesClient;
  failures: MergeFailure[];
}

export const recordFailure = (
  run: MergeRun,
  step: MergeFailureStep,
  caseId: string | null,
  error: unknown
) => {
  const reason = error instanceof Error ? error.message : String(error);
  run.failures.push({ step, caseId, reason });
  run.clientArgs.logger.warn(
    `Merging cases into case ${run.destinationId}: step "${step}" failed${
      caseId != null ? ` for case ${caseId}` : ''
    }: ${reason}`
  );
};

/**
 * Creates the destination from the merged values. Template defaults fill only what no case holds,
 * because every value a case holds is sent.
 */
export const createDestination = async (
  { owner, fields: { values }, canChangeAssignees }: MergeContext,
  sentAssignees: boolean,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const { syncAlerts } = getCaseSettings(owner);
  // Without the right to assign, the new case gets no assignees. With it, an empty list is only
  // sent when the user chose it, so a template's default assignees can fill it.
  const assignees = !canChangeAssignees
    ? { assignees: [] }
    : values.assignees.length > 0 || sentAssignees
    ? { assignees: values.assignees }
    : {};

  return create(
    {
      title: values.title,
      description: values.description,
      tags: values.tags,
      severity: values.severity,
      category: values.category,
      owner,
      connector: values.connector,
      settings: { syncAlerts },
      ...assignees,
      customFields: values.customFields.filter(({ value }) => value != null),
      ...(values.template != null ? { template: values.template } : {}),
      ...(Object.keys(values.extendedFields).length > 0
        ? { extended_fields: values.extendedFields }
        : {}),
    },
    clientArgs,
    casesClient
  );
};

const label = (rows: Array<{ key: string; label: string }>, key: string) =>
  rows.find((row) => row.key === key)?.label;

/**
 * Updates the fields the merge changes on an existing destination, without activity entries of
 * their own: the merge entry lists them.
 */
export const updateDestination = async (
  { fields: { values, fields }, canChangeAssignees }: MergeContext,
  destination: Case,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<{ destinationCase: Case; updatedFields: MergeUpdatedField[] }> => {
  const changes: Partial<CasePatchRequest> = {};
  const updatedFields: MergeUpdatedField[] = [];
  const sortedUids = (assignees: Array<{ uid: string }>) => assignees.map(({ uid }) => uid).sort();

  if (values.title !== destination.title) {
    changes.title = values.title;
    updatedFields.push({ field: 'title' });
  }
  if (values.description !== destination.description) {
    changes.description = values.description;
    updatedFields.push({ field: 'description' });
  }
  if (values.severity !== destination.severity) {
    changes.severity = values.severity;
    updatedFields.push({ field: 'severity' });
  }
  if ((values.category ?? null) !== (destination.category ?? null)) {
    changes.category = values.category;
    updatedFields.push({ field: 'category' });
  }
  if (!isEqual([...values.tags].sort(), [...destination.tags].sort())) {
    changes.tags = values.tags;
    updatedFields.push({ field: 'tags' });
  }
  if (
    canChangeAssignees &&
    !isEqual(sortedUids(values.assignees), sortedUids(destination.assignees))
  ) {
    changes.assignees = values.assignees;
    updatedFields.push({ field: 'assignees' });
  }
  const { id, type, fields: connectorFields } = values.connector;
  if (
    !isEqual(
      { id, type, fields: connectorFields },
      {
        id: destination.connector.id,
        type: destination.connector.type,
        fields: destination.connector.fields,
      }
    )
  ) {
    changes.connector = values.connector;
    updatedFields.push({ field: 'connector' });
  }
  if (!isEqual(values.template ?? null, destination.template ?? null)) {
    changes.template = values.template;
    updatedFields.push({ field: 'template' });
  }

  const changedCustomFields = values.customFields.filter(
    ({ key, value }) =>
      (destination.customFields.find((field) => field.key === key)?.value ?? null) !==
      (value ?? null)
  );
  if (changedCustomFields.length > 0) {
    changes.customFields = values.customFields;
    updatedFields.push(
      ...changedCustomFields.map(({ key }) => ({
        field: 'customFields' as const,
        key,
        label: label(fields.customFields, key),
      }))
    );
  }

  const changedExtendedFields = Object.entries(values.extendedFields).filter(
    ([key, value]) => destination.extended_fields?.[key] !== value
  );
  if (changedExtendedFields.length > 0) {
    changes.extended_fields = Object.fromEntries(changedExtendedFields);
    updatedFields.push(
      ...changedExtendedFields.map(([key]) => ({
        field: 'extendedFields' as const,
        key,
        label: label(fields.extendedFields, key),
      }))
    );
  }

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

/** Adds the destination to alerts it holds that don't list it, such as copies a stopped run wrote. */
export const relinkDestinationAlerts = async (alerts: AlertInfo[], run: MergeRun) => {
  if (alerts.length === 0) {
    return;
  }
  try {
    await run.clientArgs.services.alertsService.bulkUpdateCases({
      alerts,
      caseIds: [run.destinationId],
    });
  } catch (error) {
    recordFailure(run, 'alertLinks', run.destinationId, error);
  }
};

const addCounts = (target: MergeCounts, counts: MergeCounts) => {
  for (const kind of Object.keys(target) as Array<keyof MergeCounts>) {
    target[kind] += counts[kind];
  }
};

/**
 * Copies one source's items: attachments in bulk writes of up to 100 that never mix sources, then
 * its observables in one bulk add. A failed write is recorded and the rest is still copied, but the
 * source is then not complete.
 */
const copyItems = async (
  caseId: string,
  items: MergeCopyItem[],
  observables: Observable[],
  run: MergeRun
): Promise<{ copied: MergeCounts; complete: boolean }> => {
  const copied = emptyCounts();
  let complete = true;

  for (const chunk of chunkItems(items, MAX_BULK_CREATE_ATTACHMENTS)) {
    try {
      await bulkCreateAttachments(
        { caseId: run.destinationId, attachments: chunk.map(({ payload }) => payload) },
        run.clientArgs,
        { skipUserActions: true, skipAlertStatusSync: true, skipObservableExtraction: true }
      );
      for (const { kind, itemCount } of chunk) {
        copied[kind] += itemCount;
      }
    } catch (error) {
      complete = false;
      recordFailure(run, 'copy', caseId, error);
    }
  }

  if (observables.length > 0) {
    try {
      const updated = await bulkAddObservables(
        {
          caseId: run.destinationId,
          observables: observables.map(({ typeKey, value, description }) => ({
            typeKey,
            value,
            description,
          })),
        },
        run.clientArgs,
        run.casesClient,
        { skipUserAction: true }
      );
      // A full destination silently takes fewer observables than asked for.
      const present = new Set(
        updated.observables.map(({ typeKey, value }) => `${typeKey}|${value}`)
      );
      const added = observables.filter(({ typeKey, value }) => present.has(`${typeKey}|${value}`));
      copied.observables += added.length;
      if (added.length < observables.length) {
        complete = false;
        recordFailure(
          run,
          'observables',
          caseId,
          `${observables.length - added.length} observables did not fit in the destination`
        );
      }
    } catch (error) {
      complete = false;
      recordFailure(run, 'observables', caseId, error);
    }
  }

  return { copied, complete };
};

export interface SourceResult {
  source: Case;
  copied: MergeCounts;
  existing: MergeCounts;
  leftOut: MergeCounts;
  /** Every planned item was copied. */
  complete: boolean;
  linked: boolean;
  closed: boolean;
}

export const copySource = async (
  sourcePlan: MergeSourcePlan,
  source: Case,
  run: MergeRun
): Promise<SourceResult> => {
  const { copied, complete } = await copyItems(
    source.id,
    sourcePlan.items,
    sourcePlan.observables,
    run
  );
  return {
    source,
    copied,
    existing: { ...sourcePlan.existing },
    leftOut: { ...sourcePlan.leftOut },
    complete,
    linked: false,
    closed: false,
  };
};

const MAX_LINK_ATTEMPTS = 3;

/** How much room each limited kind has left in the destination. */
export const getRemainingRoom = (plan: MergeAttachmentPlan) => ({
  alerts: MAX_ALERTS_PER_CASE - plan.summaries.alerts.existing - plan.summaries.alerts.toCopy,
  observables:
    MAX_OBSERVABLES_PER_CASE -
    plan.summaries.observables.existing -
    plan.summaries.observables.toCopy,
});

/**
 * Links a source whose items were all copied to the destination, checked against the version the
 * merge read. When the source changed since, it copies what the source gained and tries again;
 * when another merge linked it first, it stops and the source is not merged.
 */
export const linkSource = async (
  result: SourceResult,
  sourcePlan: MergeSourcePlan,
  context: MergeContext,
  run: MergeRun,
  room: { alerts: number; observables: number }
): Promise<boolean> => {
  const {
    clientArgs: {
      user,
      services: { caseService },
    },
    casesClient,
    destinationId,
  } = run;
  const { source } = result;
  const knownDestinations = source.merge?.merged_into ?? [];
  let expectedVersion: string | undefined = source.version;

  for (let attempt = 0; attempt < MAX_LINK_ATTEMPTS; attempt++) {
    const current = await caseService.getCase({ id: source.id });
    const destinations = current.attributes.merge?.merged_into ?? [];

    if (destinations.includes(destinationId)) {
      // Linked by an earlier run of this merge: linking twice changes nothing.
      return true;
    }
    if (destinations.some((id) => !knownDestinations.includes(id))) {
      recordFailure(
        run,
        'mark',
        source.id,
        'Another merge linked this case to its destination first'
      );
      return false;
    }

    if (current.version !== expectedVersion) {
      const gained = planGainedItems({
        source: sourcePlan,
        attachments: await casesClient.attachments.getAll({ caseID: source.id }),
        observables: current.attributes.observables ?? [],
        seenKeys: context.plan.seenKeys,
        copyObservables: context.hasPlatinumLicense,
      });
      // Items gained past a limit stay on the source.
      const items = gained.items.filter(({ kind, itemCount }) => {
        if (kind !== 'alerts') {
          return true;
        }
        if (itemCount > room.alerts) {
          result.leftOut.alerts += itemCount;
          return false;
        }
        room.alerts -= itemCount;
        return true;
      });
      const observables = gained.observables.slice(0, Math.max(0, room.observables));
      result.leftOut.observables += gained.observables.length - observables.length;
      room.observables -= observables.length;

      const { copied, complete } = await copyItems(source.id, items, observables, run);
      addCounts(result.copied, copied);
      if (!complete) {
        result.complete = false;
        return false;
      }
      gained.attachmentIds.forEach((id) => sourcePlan.attachmentIds.add(id));
      gained.observableIds.forEach((id) => sourcePlan.observableIds.add(id));
      expectedVersion = current.version;
    }

    const mergedAt = new Date().toISOString();
    const {
      saved_objects: [linked],
    } = await caseService.patchCases({
      cases: [
        {
          caseId: source.id,
          originalCase: current,
          version: current.version,
          updatedAttributes: {
            merge: {
              merged_into: [...destinations, destinationId],
              merged_at: mergedAt,
              // A case an earlier merge closed stays closed by merge.
              closed_by_merge: current.attributes.merge?.closed_by_merge ?? false,
            },
            updated_at: mergedAt,
            updated_by: user,
          },
        },
      ],
      refresh: false,
    });

    if (!isSavedObjectErrorResult(linked)) {
      return true;
    }
    if (linked.error.statusCode !== 409) {
      recordFailure(run, 'mark', source.id, linked.error.message);
      return false;
    }
    // Changed between the read and the write: check what it gained before trying again.
    expectedVersion = undefined;
  }

  recordFailure(run, 'mark', source.id, 'The case kept changing while it was being merged');
  return false;
};

/**
 * Closes one linked source: no close reason, its alerts and required-on-close fields left alone.
 * Returns whether it closed.
 */
export const closeSource = async (caseId: string, run: MergeRun): Promise<boolean> => {
  const {
    clientArgs: {
      services: { caseService },
    },
  } = run;
  try {
    const current = await caseService.getCase({ id: caseId });
    if (current.attributes.status === CaseStatuses.closed) {
      return false;
    }
    if (current.version == null) {
      throw new Error('The case has no version to update against');
    }
    await bulkUpdate(
      { cases: [{ id: caseId, version: current.version, status: CaseStatuses.closed }] },
      run.clientArgs,
      run.casesClient,
      { skipAlertSync: true, skipRequiredOnClose: true, markClosedByMerge: true }
    );
    return true;
  } catch (error) {
    recordFailure(run, 'close', caseId, error);
    return false;
  }
};

export const addNote = async (note: string, owner: string, run: MergeRun) => {
  try {
    await addComment(
      {
        caseId: run.destinationId,
        comment: { type: COMMENT_ATTACHMENT_TYPE, data: { content: note }, owner },
      },
      run.clientArgs
    );
  } catch (error) {
    recordFailure(run, 'note', run.destinationId, error);
  }
};
