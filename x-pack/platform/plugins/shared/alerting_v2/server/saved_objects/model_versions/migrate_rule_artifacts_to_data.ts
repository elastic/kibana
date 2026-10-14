/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type {
  RuleSavedObjectAttributes,
  RuleSavedObjectAttributesV2,
} from '../schemas/rule_saved_object_attributes';

/**
 * The `data` key each legacy `value` moves under. The framework is agnostic to
 * artifact types, but this one-off historical conversion has to reproduce the
 * consumer conventions so existing runbooks and linked dashboards keep
 * rendering after the upgrade. Unknown types keep a lossless `{ value }`.
 */
const DATA_KEY_BY_ARTIFACT_TYPE: Readonly<Record<string, string>> = {
  [RUNBOOK_ARTIFACT_TYPE]: 'content',
  [DASHBOARD_ARTIFACT_TYPE]: 'dashboardId',
};

/**
 * Backfills the structured `artifacts[].data` from the legacy `artifacts[].value`.
 *
 * Core deep-merges a backfill result into the document and aligns arrays by
 * position, so emitting each artifact without `value` leaves the existing one
 * untouched on disk. Model version 4 drops `value` from its schema and never
 * writes it again, but leaving it there is what lets a rolled-back model
 * version 3 node — whose artifact schema still requires it — read migrated rules.
 */
export const migrateRuleArtifactsToData: SavedObjectModelDataBackfillFn<
  RuleSavedObjectAttributesV2,
  RuleSavedObjectAttributes
> = ({ attributes: { artifacts } }) => {
  if (!artifacts) {
    return { attributes: {} };
  }

  return {
    attributes: {
      artifacts: artifacts.map(({ id, type, value }) => ({
        id,
        type,
        data: { [DATA_KEY_BY_ARTIFACT_TYPE[type] ?? 'value']: value },
      })),
    },
  };
};
