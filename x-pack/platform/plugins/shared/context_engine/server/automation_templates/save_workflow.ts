/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AiIndexService } from '../ai_indices/service';
import type { DeleteWorkflowsApi } from '../types';

/**
 * The workflows management API that saving a workflow to an AI index calls. Declared structurally
 * rather than picked from the workflows management contract: workflows management reaches back
 * here through Agent Builder, so depending on it would close a project reference cycle. The real
 * API satisfies it, which Context Engine Agent Builder checks at compile time.
 */
export interface SaveWorkflowApi extends DeleteWorkflowsApi {
  getWorkflow(workflowId: string, spaceId: string, request: KibanaRequest): Promise<unknown | null>;
  createWorkflow(
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ id: string; valid: boolean }>;
  updateWorkflow(
    workflowId: string,
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ valid: boolean; validationErrors?: string[] }>;
  validateWorkflow(
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ diagnostics: Array<{ severity: string; message: string }> }>;
}

/** The privilege checks that guard a write, each throwing when the caller lacks the privilege. */
export interface WorkflowSaveAccess {
  assertCanCreate(): Promise<void>;
  assertCanUpdate(workflowId: string): Promise<void>;
}

export interface SaveAutomationResult {
  aiIndexId: string;
  workflowId: string;
  status: 'saved_and_attached' | 'attached' | 'already_attached';
  /**
   * Whether the saved definition passed schema validation. `false` means it was stored but cannot
   * be enabled or run.
   */
  valid?: boolean;
  /** Validation diagnostics explaining why the saved definition is invalid, when `valid` is false. */
  validationErrors?: string[];
}

/** Error-severity validation diagnostics for a YAML definition; never throws. */
export const collectWorkflowValidationErrors = async ({
  yaml,
  workflowsManagement,
  spaceId,
  request,
  logger,
}: {
  yaml: string;
  workflowsManagement: Pick<SaveWorkflowApi, 'validateWorkflow'>;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<string[]> => {
  try {
    const validation = await workflowsManagement.validateWorkflow(yaml, spaceId, request);
    return validation.diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => diagnostic.message);
  } catch (error) {
    logger.warn(
      `Could not collect workflow validation diagnostics: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
};

interface PersistedWorkflow {
  workflowId: string;
  newlyCreated: boolean;
  valid: boolean;
  validationErrors: string[];
}

const persistWorkflow = async ({
  yaml,
  existingWorkflowId,
  workflowsManagement,
  spaceId,
  request,
  access,
  logger,
}: {
  yaml: string;
  existingWorkflowId?: string;
  workflowsManagement: SaveWorkflowApi;
  spaceId: string;
  request: KibanaRequest;
  access: WorkflowSaveAccess;
  logger: Logger;
}): Promise<PersistedWorkflow> => {
  if (existingWorkflowId !== undefined) {
    await access.assertCanUpdate(existingWorkflowId);

    // Confirmed as an overwrite before overwriting: the user approved replacing a workflow that
    // exists. If it does not, `updateWorkflow` would fail with a message about the id rather than
    // about the choice, and the caller has a create available that it may not think to fall back
    // to. A workflow can also have been deleted since the attachment recorded it.
    const target = await workflowsManagement.getWorkflow(existingWorkflowId, spaceId, request);
    if (!target) {
      throw new Error(
        `Workflow '${existingWorkflowId}' was not found in this space, so there is nothing to ` +
          `overwrite. Omit workflowId to save this definition as a new automation.`
      );
    }

    const updated = await workflowsManagement.updateWorkflow(
      existingWorkflowId,
      { yaml },
      spaceId,
      request
    );
    return {
      workflowId: existingWorkflowId,
      newlyCreated: false,
      valid: updated.valid,
      validationErrors: updated.validationErrors ?? [],
    };
  }

  await access.assertCanCreate();
  const created = await workflowsManagement.createWorkflow({ yaml }, spaceId, request);

  const validationErrors = created.valid
    ? []
    : await collectWorkflowValidationErrors({
        yaml,
        workflowsManagement,
        spaceId,
        request,
        logger,
      });

  return {
    workflowId: created.id,
    newlyCreated: true,
    valid: created.valid,
    validationErrors,
  };
};

/**
 * Creates or overwrites a workflow and attaches it to an AI index, deleting a newly created
 * workflow when attaching it fails. A definition that fails validation is still stored and
 * attached, and reported through `valid` and `validationErrors`. Callers check Context Engine
 * write access first, and supply the workflow privilege checks as `access`.
 */
export const saveWorkflowToAiIndex = async ({
  aiIndexId,
  workflowYaml,
  existingWorkflowId,
  request,
  spaceId,
  logger,
  getAiIndexService,
  workflowsManagement,
  access,
}: {
  aiIndexId: string;
  workflowYaml: string;
  existingWorkflowId?: string;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
  getAiIndexService: () => Promise<AiIndexService>;
  workflowsManagement: SaveWorkflowApi;
  access: WorkflowSaveAccess;
}): Promise<SaveAutomationResult> => {
  const aiIndexService = await getAiIndexService();
  const isUpdate = existingWorkflowId !== undefined;

  // Fail-fast: reject before createWorkflow/updateWorkflow when the index cannot accept this automation.
  await aiIndexService.assertCanAcceptAutomation(
    aiIndexId,
    spaceId,
    existingWorkflowId ? { type: 'workflow', value: existingWorkflowId } : undefined
  );

  const { workflowId, newlyCreated, valid, validationErrors } = await persistWorkflow({
    yaml: workflowYaml,
    existingWorkflowId,
    workflowsManagement,
    spaceId,
    request,
    access,
    logger,
  });

  try {
    const attachStatus = await aiIndexService.addAutomation(aiIndexId, spaceId, {
      type: 'workflow',
      value: workflowId,
    });

    return {
      aiIndexId,
      workflowId,
      status: isUpdate || attachStatus === 'attached' ? 'saved_and_attached' : 'already_attached',
      ...(valid === false && { valid: false }),
      ...(validationErrors.length > 0 && { validationErrors }),
    };
  } catch (error) {
    if (newlyCreated) {
      try {
        await workflowsManagement.deleteWorkflows([workflowId], spaceId, request);
      } catch (deleteError) {
        logger.warn(`Failed to roll back workflow '${workflowId}' after attach failure`, {
          error: deleteError,
        });
      }
    }

    throw error;
  }
};
