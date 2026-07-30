/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelUnsafeTransformFn } from '@kbn/core-saved-objects-server';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type {
  RuleSavedObjectAttributes,
  RuleSavedObjectAttributesV1,
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
 * Replaces the legacy `artifacts[].value` with the structured `artifacts[].data`.
 *
 * Dropping `value` on purpose even if it breaks rolling back to model version 2.
 */
export const migrateRuleArtifactsToData: SavedObjectModelUnsafeTransformFn<
  RuleSavedObjectAttributesV1,
  RuleSavedObjectAttributes
> = (document) => {
  const { artifacts, ...rest } = document.attributes;

  const attributes: RuleSavedObjectAttributes = artifacts
    ? {
        ...rest,
        artifacts: artifacts.flatMap(({ id, type, value }) => {
          const dataKey = DATA_KEY_BY_ARTIFACT_TYPE[type];

          // The legacy saved object schema allowed a blank `value`, but the API
          // now requires these fields to be populated, so migrating one would
          // produce a rule the API refuses to serve. Unknown types have no
          // required fields, so they migrate whatever they carry.
          if (dataKey && !value.trim()) {
            return [];
          }

          return [{ id, type, data: { [dataKey ?? 'value']: value } }];
        }),
      }
    : rest;

  return { document: { ...document, attributes } };
};
