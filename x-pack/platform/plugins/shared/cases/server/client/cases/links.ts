/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { CASE_LINK_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type {
  CaseLinkRequest,
  RelatedCaseReason,
  RelatedCaseSummary,
  RelatedCasesResponse,
} from '../../../common/types/api';
import { CaseLinkRequestSchema } from '../../../common/types/api';
import type { Case } from '../../../common/types/domain';
import { CaseAccessMode } from '../../../common/types/domain';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { CasesClient, CasesClientArgs } from '..';

/** One page covers every link a case can hold in practice; more is logged, not shown. */
const MAX_LINKS_READ = 100;
/** Alert sharing is a hint, not an index: only the first alerts are matched. */
const MAX_ALERTS_MATCHED = 20;

export const caseNotFoundMessage = (id: string) =>
  `Case ${id} was not found or you don't have access to it.`;

const getLinkAttachments = async (casesClient: CasesClient, caseId: string) => {
  const found = await casesClient.attachments.find({
    caseID: caseId,
    findQueryParams: { type: CASE_LINK_ATTACHMENT_TYPE, perPage: MAX_LINKS_READ },
  });
  return found.data.flatMap((attachment) =>
    'attachmentId' in attachment && typeof attachment.attachmentId === 'string'
      ? [{ id: attachment.id, targetCaseId: attachment.attachmentId }]
      : []
  );
};

const toSummary = (
  theCase: Case,
  reasons: RelatedCaseReason[],
  sharedAlertIds: string[]
): RelatedCaseSummary => ({
  id: theCase.id,
  title: theCase.title,
  owner: theCase.owner,
  incremental_id: theCase.incremental_id ?? null,
  status: theCase.status,
  status_key: theCase.status_key ?? null,
  close_reason: theCase.close_reason ?? null,
  ai_verdict: theCase.ai_verdict?.verdict ?? null,
  restricted: theCase.access?.mode === CaseAccessMode.RESTRICTED,
  updated_at: theCase.updated_at ?? null,
  reasons,
  shared_alert_ids: sharedAlertIds,
});

/**
 * Links a case to other cases. Links are symmetric references: each case gets one `cases.case`
 * attachment naming the other, so both list it under Related and both record it in Activity.
 * Nothing is merged or copied, and a link grants no access. The caller must be able to read both
 * cases (a restricted case they can't see is "not found") and add attachments to both.
 */
export const linkCases = async (
  { caseId, request }: { caseId: string; request: CaseLinkRequest },
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<RelatedCasesResponse> => {
  try {
    const { target_case_ids: requested } =
      decodeWithExcessOrThrowZod(CaseLinkRequestSchema)(request);
    const targetIds = [...new Set(requested)];
    if (targetIds.includes(caseId)) {
      throw Boom.badRequest('A case cannot be linked to itself.');
    }

    const source = await casesClient.cases.get({ id: caseId, includeComments: false });
    const { cases: targets } = await casesClient.cases.bulkGet({ ids: targetIds });
    const visible = new Map(targets.map((target) => [target.id, target]));
    const missing = targetIds.find((id) => !visible.has(id));
    if (missing) {
      throw Boom.notFound(caseNotFoundMessage(missing));
    }

    const alreadyLinked = new Set(
      (await getLinkAttachments(casesClient, caseId)).map(({ targetCaseId }) => targetCaseId)
    );
    const toLink = targetIds.filter((id) => !alreadyLinked.has(id));

    if (toLink.length > 0) {
      // Check the caller can add attachments to every case first, so a link is never one-sided.
      await clientArgs.authorization.ensureAuthorized({
        operation: Operations.createComment,
        entities: [source, ...toLink.map((id) => visible.get(id) as Case)].map((c) => ({
          id: c.id,
          owner: c.owner,
        })),
      });
      await casesClient.attachments.bulkCreate({
        caseId,
        attachments: toLink.map((id) => ({
          type: CASE_LINK_ATTACHMENT_TYPE,
          owner: source.owner,
          attachmentId: id,
        })),
      });

      for (const id of toLink) {
        const target = visible.get(id) as Case;
        const backLinks = await getLinkAttachments(casesClient, id);
        const hasBackLink = backLinks.some(({ targetCaseId }) => targetCaseId === caseId);
        if (!hasBackLink) {
          await casesClient.attachments.bulkCreate({
            caseId: id,
            attachments: [
              {
                type: CASE_LINK_ATTACHMENT_TYPE,
                owner: target.owner,
                attachmentId: caseId,
              },
            ],
          });
        }
      }
    }

    return await getRelatedCases({ caseId }, clientArgs, casesClient);
  } catch (error) {
    throw createCaseError({
      message: `Failed to link case ${caseId}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
};

/**
 * Removes the link from both cases. The other side is only touched when the caller can still see
 * it; otherwise its link stays and keeps pointing at a case its readers can't see, which they never
 * see either.
 */
export const unlinkCase = async (
  { caseId, targetCaseId }: { caseId: string; targetCaseId: string },
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<RelatedCasesResponse> => {
  try {
    await casesClient.cases.get({ id: caseId, includeComments: false });
    const links = (await getLinkAttachments(casesClient, caseId)).filter(
      (link) => link.targetCaseId === targetCaseId
    );
    if (links.length === 0) {
      throw Boom.notFound(`Case ${caseId} is not linked to case ${targetCaseId}.`);
    }
    for (const link of links) {
      await casesClient.attachments.delete({ caseID: caseId, savedObjectId: link.id });
    }

    const { cases: visible } = await casesClient.cases.bulkGet({ ids: [targetCaseId] });
    if (visible.length > 0) {
      const backLinks = (await getLinkAttachments(casesClient, targetCaseId)).filter(
        (link) => link.targetCaseId === caseId
      );
      for (const link of backLinks) {
        await casesClient.attachments.delete({ caseID: targetCaseId, savedObjectId: link.id });
      }
    }

    return await getRelatedCases({ caseId }, clientArgs, casesClient);
  } catch (error) {
    throw createCaseError({
      message: `Failed to unlink case ${targetCaseId} from case ${caseId}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
};

/**
 * The Cases half of the Related tab: linked cases, and cases that share one of this case's alerts.
 * Every case is read as the viewer, so restricted cases they can't see never appear; linked ones
 * are only counted.
 */
export const getRelatedCases = async (
  { caseId }: { caseId: string },
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<RelatedCasesResponse> => {
  const {
    services: { attachmentService },
    logger,
  } = clientArgs;
  try {
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    const linkedIds = [
      ...new Set((await getLinkAttachments(casesClient, caseId)).map((l) => l.targetCaseId)),
    ];

    const alertIds = [...(await attachmentService.getter.getAllAlertIds({ caseId }))].slice(
      0,
      MAX_ALERTS_MATCHED
    );
    const sharedAlerts = new Map<string, string[]>();
    for (const alertId of alertIds) {
      const related = await casesClient.cases.getCasesByAlertID({
        alertID: alertId,
        options: { owner: theCase.owner },
      });
      for (const { id } of related.filter((c) => c.id !== caseId)) {
        sharedAlerts.set(id, [...(sharedAlerts.get(id) ?? []), alertId]);
      }
    }

    const ids = [...new Set([...linkedIds, ...sharedAlerts.keys()])];
    if (ids.length === 0) {
      return { cases: [], inaccessible_linked_count: 0 };
    }
    // bulkGet drops cases the viewer can't see, including restricted ones.
    const { cases } = await casesClient.cases.bulkGet({ ids });
    const visible = new Map(cases.map((c) => [c.id, c]));

    const summaries = ids.flatMap((id) => {
      const related = visible.get(id);
      if (!related) return [];
      const reasons: RelatedCaseReason[] = [];
      if (linkedIds.includes(id)) reasons.push('linked');
      if (sharedAlerts.has(id)) reasons.push('alert');
      return [toSummary(related, reasons, (sharedAlerts.get(id) ?? []).slice(0, 3))];
    });
    summaries.sort((a, b) => {
      const aLinked = a.reasons.includes('linked') ? 0 : 1;
      const bLinked = b.reasons.includes('linked') ? 0 : 1;
      return aLinked - bLinked || (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
    });

    return {
      cases: summaries,
      inaccessible_linked_count: linkedIds.filter((id) => !visible.has(id)).length,
    };
  } catch (error) {
    throw createCaseError({
      message: `Failed to get the related cases of case ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
