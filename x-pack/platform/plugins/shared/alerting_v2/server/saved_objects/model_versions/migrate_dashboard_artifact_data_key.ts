/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelTransformationFn } from '@kbn/core-saved-objects-server';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { RuleSavedObjectAttributes } from '../schemas/rule_saved_object_attributes';

// Reference names embed the registered field: `artifact:<field>:<artifactId>`.
// Inlined (not imported from artifact_references) so this migration stays
// frozen in time even if the live helpers change.
const LEGACY_REF_PREFIX = 'artifact:dashboardId:';
const MIGRATED_REF_PREFIX = 'artifact:dashboard_id:';

/**
 * Renames the dashboard artifact data key `dashboardId` to `dashboard_id`,
 * aligning the artifact payload with the snake_case key convention of the
 * alerting v2 APIs. Matching saved-object references are renamed from
 * `artifact:dashboardId:<artifactId>` to `artifact:dashboard_id:<artifactId>`
 * so reference-id remapping (import / copy-to-space) keeps working for rules
 * written before this model version.
 *
 * The legacy key is removed rather than kept for rollback: the artifact `data`
 * record is schema-free, so a rolled-back model version 4 node still reads
 * migrated rules without validation errors — the dashboard link simply stops
 * rendering until the rule is saved again. Keeping both keys would leak the
 * legacy key into API responses and fail the registered dashboard schema's
 * strict validation when a client writes a fetched rule back.
 */
export const migrateDashboardArtifactDataKey: SavedObjectModelTransformationFn<
  RuleSavedObjectAttributes,
  RuleSavedObjectAttributes
> = (doc) => {
  const { artifacts } = doc.attributes;
  if (!artifacts?.some((artifact) => artifact.type === DASHBOARD_ARTIFACT_TYPE)) {
    return { document: doc };
  }

  const references = (doc.references ?? []).map((ref) =>
    ref.name.startsWith(LEGACY_REF_PREFIX)
      ? { ...ref, name: `${MIGRATED_REF_PREFIX}${ref.name.slice(LEGACY_REF_PREFIX.length)}` }
      : ref
  );

  return {
    document: {
      ...doc,
      references,
      attributes: {
        ...doc.attributes,
        artifacts: artifacts.map((artifact) => {
          if (artifact.type !== DASHBOARD_ARTIFACT_TYPE || !('dashboardId' in artifact.data)) {
            return artifact;
          }
          const { dashboardId, ...data } = artifact.data;
          // Spread order lets an already-present `dashboard_id` win over the
          // legacy key, keeping the transform idempotent.
          return { ...artifact, data: { dashboard_id: dashboardId, ...data } };
        }),
      },
    },
  };
};
