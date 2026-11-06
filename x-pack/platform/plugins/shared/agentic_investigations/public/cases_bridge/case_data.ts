/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUI } from '@kbn/cases-plugin/common';
import {
  INVESTIGATION_CASE_ATTACHMENT_TYPE,
  PROPOSAL_CASE_ATTACHMENT_TYPE,
} from '../../common/cases_bridge';
import { useCanManageInvestigations } from '../investigations/hooks/use_can_manage_investigations';

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
