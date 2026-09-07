/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { resolveArtifactId } from '@kbn/alerting-v2-utils';
import { getDashboardId } from '../utils/artifact_data';
import type { RuleArtifactPayload } from '../utils/artifact_mappers';
import type { MissingDashboard } from './search_related_dashboards';

/**
 * Rebuilds dashboard artifacts from combo-box selection while preserving
 * unresolved (missing) artifacts that are not represented in the selection.
 */
export const buildDashboardArtifactsFromSelection = ({
  selectedOptions,
  currentArtifacts,
  missingDashboards,
}: {
  selectedOptions: Array<EuiComboBoxOptionOption<string>>;
  currentArtifacts: RuleArtifactPayload;
  missingDashboards: MissingDashboard[];
}): RuleArtifactPayload => {
  const missingIds = new Set(missingDashboards.map((entry) => entry.id));
  const preservedMissingArtifacts = currentArtifacts.filter((artifact) => {
    const dashboardId = getDashboardId(artifact);
    return dashboardId != null && missingIds.has(dashboardId);
  });

  const selectedArtifacts = selectedOptions.flatMap((selectedOption) => {
    const dashboardId = selectedOption.value?.trim();
    if (!dashboardId) {
      return [];
    }

    const existingArtifact = currentArtifacts.find(
      (artifact) => getDashboardId(artifact) === dashboardId
    );

    return [
      {
        id: resolveArtifactId(DASHBOARD_ARTIFACT_TYPE, existingArtifact?.id),
        type: DASHBOARD_ARTIFACT_TYPE,
        data: { dashboardId },
      },
    ];
  });

  return [...selectedArtifacts, ...preservedMissingArtifacts];
};

/**
 * Splits rule artifacts into dashboard vs non-dashboard entries.
 */
export const partitionArtifactsByDashboardType = (
  artifacts: RuleArtifactPayload
): {
  dashboardArtifacts: RuleArtifactPayload;
  otherArtifacts: RuleArtifactPayload;
} => {
  const dashboardArtifacts: RuleArtifactPayload = [];
  const otherArtifacts: RuleArtifactPayload = [];

  for (const artifact of artifacts) {
    if (artifact.type === DASHBOARD_ARTIFACT_TYPE) {
      dashboardArtifacts.push(artifact);
    } else {
      otherArtifacts.push(artifact);
    }
  }

  return { dashboardArtifacts, otherArtifacts };
};
