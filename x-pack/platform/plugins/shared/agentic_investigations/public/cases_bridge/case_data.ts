/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUI } from '@kbn/cases-plugin/common';
import type { CaseImpactedEntity } from '@kbn/cases-plugin/public';
import {
  IMPACT_CASE_ATTACHMENT_TYPE,
  INVESTIGATION_CASE_ATTACHMENT_TYPE,
  PROPOSAL_CASE_ATTACHMENT_TYPE,
  type ImpactCaseAttachmentData,
} from '../../common/cases_bridge';
import { useCanManageInvestigations } from '../investigations/hooks/use_can_manage_investigations';

/** The Decisions tab's `tabId` on the case view. */
export const DECISIONS_TAB_ID = 'decisions';

/** The investigation ids a case links, from its attachments. */
export const getLinkedInvestigationIds = (caseData: Pick<CaseUI, 'comments'>): string[] => {
  const ids = new Set<string>();
  for (const comment of caseData.comments) {
    const attachment = comment as { type?: string; attachmentId?: unknown };
    if (
      attachment.type === INVESTIGATION_CASE_ATTACHMENT_TYPE &&
      typeof attachment.attachmentId === 'string'
    ) {
      ids.add(attachment.attachmentId);
    }
  }
  return [...ids];
};

/** The investigations a case links, with the title their attachment was saved with. */
export const getLinkedInvestigations = (
  caseData: Pick<CaseUI, 'comments'>
): Array<{ id: string; title?: string }> => {
  const byId = new Map<string, string | undefined>();
  for (const comment of caseData.comments) {
    const attachment = comment as {
      type?: string;
      attachmentId?: unknown;
      metadata?: { title?: unknown } | null;
    };
    if (
      attachment.type === INVESTIGATION_CASE_ATTACHMENT_TYPE &&
      typeof attachment.attachmentId === 'string'
    ) {
      const title = attachment.metadata?.title;
      byId.set(attachment.attachmentId, typeof title === 'string' ? title : undefined);
    }
  }
  return [...byId].map(([id, title]) => ({ id, title }));
};

export const hasLinkedInvestigations = (caseData: Pick<CaseUI, 'comments'>): boolean =>
  getLinkedInvestigationIds(caseData).length > 0;

/** Linking needs Cases update on the case and the investigations manage privilege. */
export const useCanLinkInvestigations = (canUpdateCase: boolean): boolean => {
  const canManageInvestigations = useCanManageInvestigations();
  return canUpdateCase && canManageInvestigations;
};

/** The case carries at least one decision (a proposal raised in its investigation). */
export const hasDecisions = (caseData: Pick<CaseUI, 'comments'>): boolean =>
  caseData.comments.some(
    (comment) => (comment as { type?: string }).type === PROPOSAL_CASE_ATTACHMENT_TYPE
  );

/** The hosts and users the case's copied Impact names, for the case's Scope panel. */
export const getImpactedEntities = (caseData: Pick<CaseUI, 'comments'>): CaseImpactedEntity[] =>
  caseData.comments.flatMap((comment) => {
    const attachment = comment as { type?: string; data?: ImpactCaseAttachmentData };
    if (attachment.type !== IMPACT_CASE_ATTACHMENT_TYPE || !attachment.data) return [];
    return attachment.data.entities.map(({ id, name, type }) => ({
      type: type === 'host' || type === 'user' ? type : 'other',
      name: name || id,
    }));
  });
