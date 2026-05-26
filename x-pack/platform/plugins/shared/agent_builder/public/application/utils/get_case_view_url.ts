/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';

const OWNER_TO_APP_ID: Record<string, string> = {
  securitySolution: 'securitySolutionUI',
  observability: 'observability-overview',
  cases: 'management',
};

/**
 * Builds a case view URL for the Cases owner app. Returns undefined when the owner is unknown.
 */
export const getCaseViewUrl = ({
  application,
  caseId,
  owner,
}: {
  application: ApplicationStart;
  caseId: string;
  owner: string;
}): string | undefined => {
  const appId = OWNER_TO_APP_ID[owner];
  if (!appId) {
    return undefined;
  }

  const casesPath =
    owner === 'cases' ? `/insightsAndAlerting/cases/${caseId}` : `/cases/${caseId}`;

  try {
    return application.getUrlForApp(appId, { path: casesPath });
  } catch {
    return undefined;
  }
};
