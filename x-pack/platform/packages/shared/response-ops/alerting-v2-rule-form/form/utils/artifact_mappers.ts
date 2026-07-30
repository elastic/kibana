/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';

export type RuleArtifactPayload = Array<{
  id: string;
  type: string;
  data: Record<string, any>;
}>;

export interface RuleArtifactSlices {
  artifacts?: RuleArtifactPayload;
  runbookArtifacts?: RuleArtifactPayload;
  dashboardArtifacts?: RuleArtifactPayload;
}

export const mapArtifacts = (
  artifacts: RuleArtifactPayload | undefined
): RuleArtifactPayload | undefined => (artifacts?.length ? artifacts : undefined);

export const splitArtifactsByType = (
  artifacts: RuleArtifactPayload | undefined
): RuleArtifactSlices => {
  const otherArtifacts: RuleArtifactPayload = [];
  const runbookArtifacts: RuleArtifactPayload = [];
  const dashboardArtifacts: RuleArtifactPayload = [];

  for (const artifact of artifacts ?? []) {
    if (artifact.type === RUNBOOK_ARTIFACT_TYPE) {
      runbookArtifacts.push(artifact);
    } else if (artifact.type === DASHBOARD_ARTIFACT_TYPE) {
      dashboardArtifacts.push(artifact);
    } else {
      otherArtifacts.push(artifact);
    }
  }

  return {
    ...(otherArtifacts.length ? { artifacts: otherArtifacts } : {}),
    ...(runbookArtifacts.length ? { runbookArtifacts } : {}),
    ...(dashboardArtifacts.length ? { dashboardArtifacts } : {}),
  };
};

export const mergeArtifactsByType = ({
  artifacts,
  runbookArtifacts,
  dashboardArtifacts,
}: RuleArtifactSlices): RuleArtifactPayload | undefined => {
  const mergedArtifacts = [
    ...(artifacts ?? []),
    ...(runbookArtifacts ?? []),
    ...(dashboardArtifacts ?? []),
  ];
  return mergedArtifacts.length ? mergedArtifacts : undefined;
};
