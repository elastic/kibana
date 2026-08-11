/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';

export type RuleArtifactPayload = Array<{ id: string; type: string; value: string }>;

export interface RuleArtifactSlices {
  artifacts?: RuleArtifactPayload;
  runbookArtifacts?: RuleArtifactPayload;
  dashboardArtifacts?: RuleArtifactPayload;
}

const NORMALIZED_ARTIFACT_TYPES = new Set([RUNBOOK_ARTIFACT_TYPE, DASHBOARD_ARTIFACT_TYPE]);

const createArtifactId = (artifactType: string) =>
  `${artifactType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const mapArtifacts = (
  artifacts: RuleArtifactPayload | undefined
): RuleArtifactPayload | undefined => {
  const currentArtifacts = artifacts ?? [];

  const normalizedArtifacts = currentArtifacts.flatMap((artifact) => {
    if (!NORMALIZED_ARTIFACT_TYPES.has(artifact.type)) {
      return [artifact];
    }

    const artifactValue = artifact.value.trim();
    if (!artifactValue) {
      return [];
    }

    return [
      {
        ...artifact,
        id: artifact.id.trim() ? artifact.id : createArtifactId(artifact.type),
        value: artifactValue,
      },
    ];
  });

  return normalizedArtifacts.length ? normalizedArtifacts : undefined;
};

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
