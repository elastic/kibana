/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_ARTIFACT_TYPE,
  DEFAULT_ARTIFACT_DATA_FIELD_LIMIT,
  RUNBOOK_ARTIFACT_TYPE,
  RUNBOOK_CONTENT_LIMIT,
} from '@kbn/alerting-v2-constants';
import { z } from '@kbn/zod/v4';
import type { ArtifactTypeRegistry } from './artifact_type_registry';

/**
 * Non-empty, non-blank string bounded by `max`. Rejects via refine rather than
 * `.trim()` so stored markdown is not rewritten on parse. The refine subsumes a
 * `.min(1)`, which would only add a redundant second issue for `''`.
 */
const nonBlankString = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, {
      error: 'must not be empty or contain only whitespace',
    });

/**
 * Bounded non-blank string used as `data.dashboardId` on dashboard artifacts.
 * Also reused by the agent-builder `set_dashboards` operation so tool-level
 * validation stays in sync with the registered dashboard schema.
 */
export const dashboardIdSchema = nonBlankString(DEFAULT_ARTIFACT_DATA_FIELD_LIMIT);

/**
 * Registers the RnA-owned built-in artifact types (runbook, dashboard).
 * Solution-owned types register via `AlertingServerSetup.registerArtifactType`
 * from their own plugins.
 */
export function registerBuiltinArtifactTypes(registry: ArtifactTypeRegistry): void {
  registry.register({
    type: RUNBOOK_ARTIFACT_TYPE,
    dataSchema: z
      .object({
        content: nonBlankString(RUNBOOK_CONTENT_LIMIT),
      })
      .strict(),
  });

  registry.register({
    type: DASHBOARD_ARTIFACT_TYPE,
    dataSchema: z
      .object({
        dashboardId: dashboardIdSchema,
      })
      .strict(),
    references: [{ field: 'dashboardId', savedObjectType: 'dashboard' }],
  });
}
