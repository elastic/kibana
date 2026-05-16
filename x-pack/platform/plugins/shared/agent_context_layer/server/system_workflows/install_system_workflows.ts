/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { CreateWorkflowCommand } from '@kbn/workflows';
import { SML_SYSTEM_WORKFLOW_TAG } from '../../common/constants';
import type { WorkflowsManagementApiContract } from '../types';
import { SML_SYSTEM_WORKFLOW_TEMPLATES } from './templates';

/**
 * Recognises the "Workflow with id 'X' already exists" conflict raised by
 * `WorkflowCrudService.createWorkflow` so the installer can decide whether to
 * attempt recovery. We match on the error name first (the workflows_management
 * plugin uses a `WorkflowConflictError` class) and fall back to the canonical
 * message shape for robustness against future error refactors.
 */
const isConflictError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'WorkflowConflictError') return true;
  return /already exists/i.test(error.message);
};

export interface InstallSystemWorkflowsResult {
  /** Workflow ids created during this invocation. */
  created: string[];
  /**
   * Workflow ids that already existed (live, not deleted) AND whose YAML
   * already matches the bundled template — left untouched.
   */
  skipped: string[];
  /**
   * Workflow ids that already existed (live, not deleted) but whose YAML
   * differed from the bundled template — refreshed in place via
   * `updateWorkflow`. Used to repair the broken-template case where an older
   * install left a workflow with stale (or invalid) YAML.
   */
  updated: string[];
  /**
   * Workflow ids whose soft-deleted tombstone was found and purged before
   * recreating the workflow from the bundled template.
   */
  reinstalled: string[];
  /** Workflow ids whose creation failed, paired with the failure message. */
  failed: Array<{ id: string; reason: string }>;
}

/**
 * Installs the bundled SML system workflows.
 *
 * Triggered from a route handler (the ACL admin page "Install default
 * workflows" action). Uses the caller's `KibanaRequest` to drive the standard
 * `workflowsManagement.createWorkflow` API — matching the convention used by
 * the streams plugin's `createContinuousKiExtractionWorkflowService`.
 *
 * Three branches per template:
 *
 *   1. **Live workflow exists, still tagged `sml-system`** — its YAML is
 *      compared against the bundled template. If equal, skipped (operator
 *      edits limited to non-YAML fields are preserved). If different, the
 *      YAML is refreshed in place via `updateWorkflow`. This repairs the
 *      "first install crashed with invalid YAML, leaving an Untitled
 *      workflow" case without requiring the operator to manually delete
 *      anything. A live workflow that has lost the `sml-system` tag is
 *      treated as user-owned and left untouched.
 *   2. **Soft-deleted tombstone exists** — the workflows_management plugin
 *      enforces global `_id` uniqueness across spaces *and* across soft-
 *      deleted tombstones, so a vanilla `createWorkflow` call would fail with
 *      `Workflow with id 'X' already exists`. The installer instead
 *      hard-deletes the tombstone via `deleteWorkflows({ force: true })` and
 *      then creates a fresh document. Reported under `reinstalled`.
 *   3. **Nothing exists** — straight create. Reported under `created`.
 *
 * The user invoking this function must hold the `workflowsManagement:create`
 * (and, for the tombstone branch, `workflowsManagement:delete`) privileges in
 * addition to the ACL feature privilege that gates access to the admin page.
 */
export const installSystemWorkflows = async ({
  workflowsManagementApi,
  request,
  spaceId,
  logger,
}: {
  workflowsManagementApi: WorkflowsManagementApiContract;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
}): Promise<InstallSystemWorkflowsResult> => {
  const result: InstallSystemWorkflowsResult = {
    created: [],
    skipped: [],
    updated: [],
    reinstalled: [],
    failed: [],
  };

  if (!workflowsManagementApi.isWorkflowsAvailable) {
    logger.debug('Workflows feature is not available; skipping SML system workflow install.');
    return result;
  }

  for (const template of SML_SYSTEM_WORKFLOW_TEMPLATES) {
    try {
      const live = await workflowsManagementApi.getWorkflow(template.id, spaceId);
      if (live) {
        // `WorkflowDetailDto` doesn't expose `tags` directly (only `yaml` +
        // parsed `definition`). For invalid stored YAML `definition` is null,
        // so we sniff the raw YAML text for the SML ownership tag. This
        // catches the "broken Untitled workflow from a previous install"
        // case where `definition` is null but the stored YAML still carries
        // our `sml-system` tag.
        const liveYaml = (live as { yaml?: string }).yaml ?? '';
        const liveTags = (live as { definition?: { tags?: string[] } }).definition?.tags ?? [];
        const isSmlOwned =
          liveTags.includes(SML_SYSTEM_WORKFLOW_TAG) ||
          /(^|\n)\s*-\s*sml-system\s*(?:#|$)/m.test(liveYaml);
        if (!isSmlOwned) {
          result.skipped.push(template.id);
          continue;
        }
        if (normaliseYaml(liveYaml) === normaliseYaml(template.yaml)) {
          result.skipped.push(template.id);
          continue;
        }
        logger.info(
          `Refreshing SML system workflow '${template.id}' to match the bundled template.`
        );
        await workflowsManagementApi.updateWorkflow(
          template.id,
          { yaml: template.yaml },
          spaceId,
          request
        );
        result.updated.push(template.id);
        continue;
      }

      // No live workflow — check for a soft-deleted tombstone. The
      // workflows_management plugin keeps the ES `_id` reserved even for
      // soft-deleted docs, so a subsequent `createWorkflow` would otherwise
      // fail with a confusing "already exists" error.
      const tombstone = await workflowsManagementApi.getWorkflow(template.id, spaceId, {
        includeDeleted: true,
      });
      let isReinstall = false;
      if (tombstone) {
        logger.info(
          `Found soft-deleted tombstone for SML system workflow '${template.id}' — hard-deleting before reinstall.`
        );
        const purge = await workflowsManagementApi.deleteWorkflows(
          [template.id],
          spaceId,
          request,
          { force: true }
        );
        const failure = purge.failures.find((f) => f.id === template.id);
        if (failure) {
          throw new Error(
            `failed to purge soft-deleted tombstone for '${template.id}': ${failure.error}`
          );
        }
        isReinstall = true;
      }

      const command: CreateWorkflowCommand = { yaml: template.yaml, id: template.id };
      try {
        await workflowsManagementApi.createWorkflow(command, spaceId, request);
      } catch (createError) {
        // Defensive recovery: the create-conflict check is GLOBAL (across
        // spaces and across soft-deleted tombstones — see
        // `WorkflowCrudService.checkExistingIds`), but `getWorkflow` is
        // space-scoped. If a tombstone (or stale doc) lives in a different
        // space than the install context, the lookup above misses it but the
        // create still fails. As a last resort try a forced delete in the
        // current space and retry once; if that delete reports no rows then
        // the conflict is genuinely cross-space and we surface a clearer
        // error so the operator can deal with it manually.
        if (!isConflictError(createError)) {
          throw createError;
        }
        const purge = await workflowsManagementApi.deleteWorkflows(
          [template.id],
          spaceId,
          request,
          { force: true }
        );
        if (purge.deleted === 0) {
          throw new Error(
            `Workflow id '${template.id}' is already in use by another workflow that is not visible in this space. ` +
              `Hard-delete it from its owning space (or via the workflows management UI with force=true) and retry.`
          );
        }
        await workflowsManagementApi.createWorkflow(command, spaceId, request);
        isReinstall = true;
      }

      if (isReinstall) {
        logger.info(`Reinstalled SML system workflow '${template.id}'.`);
        result.reinstalled.push(template.id);
      } else {
        logger.info(`Installed SML system workflow '${template.id}'.`);
        result.created.push(template.id);
      }
    } catch (error) {
      const reason = (error as Error).message;
      result.failed.push({ id: template.id, reason });
      logger.error(`Failed to install SML system workflow '${template.id}': ${reason}`);
    }
  }

  logger.info(
    `SML system workflow install finished — created: ${result.created.length}, updated: ${result.updated.length}, reinstalled: ${result.reinstalled.length}, skipped: ${result.skipped.length}, failed: ${result.failed.length}.`
  );
  return result;
};

/** Normalise YAML for equality checks: trim trailing whitespace and EOL. */
const normaliseYaml = (yaml: string | undefined | null): string => {
  if (!yaml) return '';
  return yaml.replace(/\s+$/gm, '').replace(/\r\n/g, '\n').trim();
};
