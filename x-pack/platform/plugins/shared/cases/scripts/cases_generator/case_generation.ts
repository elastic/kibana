/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { logger } from './logger';
import { bulkCreateAttachmentSOs } from './kibana_ops';
import type { CreatedAttachment, GenerateCasesParams, KbnContext } from './types';
import { casesBasePath, chunk, formatRequestError, rng, runWithRetry } from './utils';

const ATTACHMENT_BULK_LIMIT = 100;
const CASE_PATCH_BATCH_LIMIT = 100;

type CaseStatus = 'open' | 'in-progress' | 'closed';

interface CreatedCaseRef {
  id: string;
  version: string;
  targetStatus: CaseStatus;
}

// Picks a target status for a generated case using a fixed mix
// (~60% open, ~25% in-progress, ~15% closed). Used so the generated dataset
// shows a realistic distribution rather than every case sitting in "open".
function pickRandomStatus(): CaseStatus {
  const r = rng();
  if (r < 0.6) return 'open';
  if (r < 0.85) return 'in-progress';
  return 'closed';
}

// Re-fetches the current `version` for each case ref so the bulk PATCH won't
// 409 on stale versions. Posting attachments bumps a case's version, so the
// versions captured at create time are usually stale by the time we patch
// statuses. Used by bulkPatchCaseStatuses.
async function refreshCaseVersions(
  ctx: KbnContext,
  space: string,
  refs: CreatedCaseRef[]
): Promise<CreatedCaseRef[]> {
  const basePath = casesBasePath(space);
  const refreshed = await pMap(
    refs,
    async (ref) => {
      try {
        const { data } = await runWithRetry(
          () =>
            ctx.kbnClient.request<{ id: string; version: string }>({
              method: 'GET',
              path: `${basePath}/api/cases/${ref.id}`,
              headers: ctx.headers,
            }),
          { label: `refresh_case_${ref.id}` }
        );
        return { ...ref, version: data.version };
      } catch (err) {
        logger.error(`Error refreshing case ${ref.id} version: ${formatRequestError(err)}`);
        return null;
      }
    },
    { concurrency: 25 }
  );
  return refreshed.filter((r): r is CreatedCaseRef => r !== null);
}

// Patches the status of every case whose target status is something other
// than 'open' (which is the default at creation time). Refreshes versions
// first so the bulk PATCH succeeds, then sends batched PATCHes. Called once
// per space at the end of generateCases so the final dataset has a realistic
// status mix.
async function bulkPatchCaseStatuses({
  ctx,
  space,
  refs,
}: {
  ctx: KbnContext;
  space: string;
  refs: CreatedCaseRef[];
}): Promise<void> {
  const needsPatch = refs.filter((ref) => ref.targetStatus !== 'open');
  if (needsPatch.length === 0) return;

  const distribution = needsPatch.reduce<Record<string, number>>((acc, ref) => {
    acc[ref.targetStatus] = (acc[ref.targetStatus] ?? 0) + 1;
    return acc;
  }, {});
  logger.info(
    `Patching status on ${needsPatch.length} case(s): ${Object.entries(distribution)
      .map(([status, n]) => `${status}=${n}`)
      .join(', ')}`
  );

  // Versions captured at creation time are stale because attachment POSTs bump
  // the case version. Refetch current versions before issuing the bulk PATCH.
  const refreshed = await refreshCaseVersions(ctx, space, needsPatch);
  if (refreshed.length === 0) return;

  const path = `${casesBasePath(space)}/api/cases`;
  for (const batch of chunk(refreshed, CASE_PATCH_BATCH_LIMIT)) {
    try {
      await runWithRetry(
        () =>
          ctx.kbnClient.request({
            method: 'PATCH',
            path,
            headers: ctx.headers,
            body: {
              cases: batch.map((ref) => ({
                id: ref.id,
                version: ref.version,
                status: ref.targetStatus,
              })),
            },
          }),
        { label: `bulk_patch_case_statuses_${batch.length}` }
      );
    } catch (err) {
      logger.error(`Error patching case statuses: ${formatRequestError(err)}`);
    }
  }
}

interface PendingAttachment {
  body: Record<string, unknown>;
  record: CreatedAttachment;
}

// Posts the pending attachments for one case via the bulk_create attachments
// endpoint, in batches of ATTACHMENT_BULK_LIMIT, and records the ones that
// succeeded into `list` for the saved-object follow-up step. Called by
// generateCases once per case after the case POST returns an id.
async function postBulkAttachments({
  ctx,
  caseId,
  space,
  pending,
  list,
}: {
  ctx: KbnContext;
  caseId: string;
  space: string;
  pending: PendingAttachment[];
  list: CreatedAttachment[];
}): Promise<void> {
  if (pending.length === 0) return;
  const path = `${casesBasePath(space)}/internal/cases/${caseId}/attachments/_bulk_create`;

  for (const batch of chunk(pending, ATTACHMENT_BULK_LIMIT)) {
    try {
      await runWithRetry(
        () =>
          ctx.kbnClient.request({
            method: 'POST',
            path,
            headers: ctx.headers,
            body: batch.map((p) => p.body),
          }),
        { label: `bulk_attachments_case_${caseId}` }
      );
      for (const item of batch) {
        list.push(item.record);
      }
    } catch (err) {
      logger.error(
        `Error bulk-adding ${batch.length} attachment(s) to case ${caseId}: ${formatRequestError(
          err
        )}`
      );
    }
  }
}

// Top-level per-space worker: POSTs every prebuilt case in `cases`,
// attaches the requested number of comments/alerts/events to each, mirrors
// those attachments into the saved-objects store, and then patches a random
// mix of statuses on the result. Called once per target space by run.ts.
export async function generateCases(
  {
    cases,
    space,
    commentsPerCase,
    alertsPerCase,
    eventsPerCase,
    alertsByOwner,
    events,
    concurrency: concurrencyOverride,
  }: GenerateCasesParams,
  ctx: KbnContext
) {
  const casesPath = `${casesBasePath(space)}/api/cases`;
  const totalAttachments = commentsPerCase + alertsPerCase + eventsPerCase;

  const spaceLabel = space ? `space: ${space}` : 'default space';
  const parts: string[] = [];
  if (commentsPerCase > 0) parts.push(`${commentsPerCase} comments`);
  if (alertsPerCase > 0) parts.push(`${alertsPerCase} alerts`);
  if (eventsPerCase > 0) parts.push(`${eventsPerCase} events`);

  logger.info(
    `Creating ${cases.length} cases in ${spaceLabel}${
      parts.length > 0 ? ` with ${parts.join(', ')} each` : ''
    }`
  );

  const concurrency =
    concurrencyOverride && concurrencyOverride > 0
      ? concurrencyOverride
      : totalAttachments > 0
      ? 10
      : 30;
  const createdAttachments: CreatedAttachment[] = [];
  const createdCaseRefs: CreatedCaseRef[] = [];

  // Precompute per-case offsets so concurrent pMap tasks don't race on shared cursors.
  // Each case gets a stable position within its owner-bucket and within the non-observability
  // bucket, so alert/event attachments are distributed across the indexed pools instead of
  // every concurrent task starting from the same cursor.
  const ownerSeq = new Map<string, number>();
  let nonObsSeq = 0;
  const offsets = cases.map((oneCase) => {
    const ownerIdx = ownerSeq.get(oneCase.owner) ?? 0;
    ownerSeq.set(oneCase.owner, ownerIdx + 1);
    if (oneCase.owner === 'observability') {
      return { ownerIdx, nonObsIdx: -1 };
    }
    const nonObsIdx = nonObsSeq;
    nonObsSeq += 1;
    return { ownerIdx, nonObsIdx };
  });

  let completed = 0;
  const progressEvery = Math.max(1, Math.floor(cases.length / 10));

  await pMap(
    cases,
    async (newCase, index) => {
      const { ownerIdx, nonObsIdx } = offsets[index];
      try {
        const { data: created } = await runWithRetry(
          () =>
            ctx.kbnClient.request<{ id: string; version: string }>({
              method: 'POST',
              path: casesPath,
              headers: ctx.headers,
              body: newCase,
            }),
          { label: `create_case_${newCase.title}` }
        );

        const caseId = created.id;
        createdCaseRefs.push({
          id: caseId,
          version: created.version,
          targetStatus: pickRandomStatus(),
        });
        if (totalAttachments === 0) return;

        const pending: PendingAttachment[] = [];

        for (let i = 0; i < commentsPerCase; i++) {
          const comment = `Auto generated comment ${i + 1}`;
          pending.push({
            body: { type: 'user', comment, owner: newCase.owner },
            record: { caseId, owner: newCase.owner, type: 'user', comment },
          });
        }

        const ownerAlerts = alertsByOwner.get(newCase.owner) ?? [];
        if (alertsPerCase > 0 && ownerAlerts.length === 0) {
          logger.warning(
            `No indexed alerts found for owner "${newCase.owner}" while ${alertsPerCase} alert attachments were requested`
          );
        }
        const alertBase = ownerIdx * alertsPerCase;
        for (let i = 0; i < alertsPerCase && ownerAlerts.length > 0; i++) {
          const alert = ownerAlerts[(alertBase + i) % ownerAlerts.length];
          const rule = { id: alert.ruleId, name: alert.ruleName };
          pending.push({
            body: {
              type: 'alert',
              alertId: alert.alertId,
              index: alert.index,
              rule,
              owner: newCase.owner,
            },
            record: {
              caseId,
              owner: newCase.owner,
              type: 'alert',
              alertId: alert.alertId,
              index: alert.index,
              rule,
            },
          });
        }

        if (newCase.owner !== 'observability' && nonObsIdx >= 0 && events.length > 0) {
          const eventBase = nonObsIdx * eventsPerCase;
          for (let i = 0; i < eventsPerCase; i++) {
            const event = events[(eventBase + i) % events.length];
            pending.push({
              body: {
                type: 'event',
                eventId: event.eventId,
                index: event.index,
                owner: newCase.owner,
              },
              record: {
                caseId,
                owner: newCase.owner,
                type: 'event',
                eventId: event.eventId,
                index: event.index,
              },
            });
          }
        }

        await postBulkAttachments({ ctx, caseId, space, pending, list: createdAttachments });
      } catch (err) {
        logger.error(`Error creating case "${newCase.title}": ${formatRequestError(err)}`);
      } finally {
        completed += 1;
        if (completed % progressEvery === 0 || completed === cases.length) {
          logger.info(`  Created ${completed}/${cases.length} cases`);
        }
      }
    },
    { concurrency }
  );

  if (createdAttachments.length > 0) {
    logger.info(`Creating ${createdAttachments.length} attachment SOs via saved objects API...`);
    await bulkCreateAttachmentSOs({ ctx, attachments: createdAttachments, space });
  }

  await bulkPatchCaseStatuses({ ctx, space, refs: createdCaseRefs });
}
