/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectReference } from '@kbn/core/server';
import type { Artifacts } from '../../types';
import type { DenormalizedArtifacts } from '../types';

export function denormalizeArtifacts(ruleArtifacts: Artifacts | undefined): {
  artifacts: Required<DenormalizedArtifacts>;
  references: SavedObjectReference[];
} {
  const references: SavedObjectReference[] = [];
  const artifacts: Required<DenormalizedArtifacts> = {
    dashboards: [],
    rules: [],
    investigation_guide: { blob: '' },
  };

  if (!ruleArtifacts) {
    return { artifacts, references };
  }

  if (ruleArtifacts.investigation_guide) {
    artifacts.investigation_guide = {
      blob: ruleArtifacts.investigation_guide.blob,
    };
  }

  if (ruleArtifacts.dashboards) {
    ruleArtifacts.dashboards.forEach((dashboard, i) => {
      const refName = `dashboard_${i}`;
      const dashboardRef = {
        id: dashboard.id,
        name: refName,
        type: 'dashboard',
      };
      references.push(dashboardRef);

      artifacts.dashboards.push({
        refId: refName,
      });
    });
  }

  if (ruleArtifacts.rules) {
    ruleArtifacts.rules.forEach((rule, i) => {
      const refName = `rule_${i}`;
      const ruleRef = {
        id: rule.id,
        name: refName,
        type: 'alert',
      };
      references.push(ruleRef);

      artifacts.rules.push({
        refId: refName,
      });
    });
  }

  return {
    artifacts,
    references,
  };
}
