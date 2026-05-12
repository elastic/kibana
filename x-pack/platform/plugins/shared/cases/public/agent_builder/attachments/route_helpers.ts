/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GENERAL_CASES_OWNER, OWNER_INFO } from '../../../common/constants';
import type { CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';

const getOwnerInfo = (owner: string) => {
  const info = (OWNER_INFO as Record<string, { appId: string }>)[owner];
  return info ?? OWNER_INFO[GENERAL_CASES_OWNER];
};

export const getAppIdForOwner = (owner: string): string => getOwnerInfo(owner).appId;

export const getCasePathForOwner = (owner: string, caseId: string): string => {
  if (owner === GENERAL_CASES_OWNER) {
    return `/insightsAndAlerting/cases/${caseId}`;
  }
  return `/cases/${caseId}`;
};

export const getCasesListPathForOwner = (owner: string, query?: string): string => {
  const base = owner === GENERAL_CASES_OWNER ? '/insightsAndAlerting/cases' : '/cases';
  return query ? `${base}?${query}` : base;
};

export const buildCasesFilterQuery = (cases: CaseAttachmentData[]): string => {
  const params = new URLSearchParams();
  const severities = new Set(cases.map((c) => c.severity));
  if (severities.size > 0 && severities.size < 4) {
    params.set('severity', Array.from(severities).join(','));
  }
  const owners = new Set(cases.map((c) => c.owner));
  if (owners.size === 1) {
    params.set('owner', cases[0].owner);
  }
  return params.toString();
};

export const getSharedOwner = (cases: CaseAttachmentData[]): string => {
  const owners = new Set(cases.map((c) => c.owner));
  return owners.size === 1 ? cases[0].owner : GENERAL_CASES_OWNER;
};
