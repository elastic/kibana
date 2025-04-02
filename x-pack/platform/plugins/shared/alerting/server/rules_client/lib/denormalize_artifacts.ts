/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectReference } from '@kbn/core/server';
import type { Artifact } from '../../types';
import type { DenormalizedArtifacts } from '../types';

export function denormalizeArtifacts(ruleArtifacts: Artifact | undefined): {
  artifacts: DenormalizedArtifacts;
  references: SavedObjectReference[];
} {
  const references: SavedObjectReference[] = [];

  const artifacts: DenormalizedArtifacts = {
    dashboards: [],
    investigation_guide: ruleArtifacts?.investigation_guide,
  };

  if (ruleArtifacts && ruleArtifacts.dashboards) {
    ruleArtifacts.dashboards.forEach((dashboard, i) => {
      const refName = `dashboard_${i}`;
      const dashboardRef = {
        id: dashboard.id,
        name: refName,
        type: 'dashboard',
      };
      references.push(dashboardRef);
      if (!artifacts.dashboards) {
        artifacts.dashboards = [];
      }
      artifacts.dashboards.push({
        refId: refName,
      });
    });
  }

  return {
    artifacts,
    references,
  };
}
