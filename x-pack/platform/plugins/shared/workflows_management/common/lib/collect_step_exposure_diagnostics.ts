/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import { collectAllSteps } from '@kbn/workflows';
import type { WorkflowDiagnostic } from '@kbn/workflows/types/v1';
import { getStepExposure } from '../schema';

export const getInternalStepMessage = (stepType: string): string =>
  i18n.translate('workflows.validateStepExposure.internalStepWarningMessage', {
    defaultMessage:
      'Step type "{stepType}" is an internal step. Use it at your own risk: its inputs, outputs and behavior can change without notice.',
    values: { stepType },
  });

export const getManagedOnlyStepMessage = (stepType: string): string =>
  i18n.translate('workflows.validateStepExposure.managedOnlyStepErrorMessage', {
    defaultMessage:
      'Step type "{stepType}" is an internal step and can\'t be used in custom workflows.',
    values: { stepType },
  });

/**
 * Reports each `managed_only` step type used in a workflow that isn't managed, once per type.
 * The server counterpart of the editor's `validateStepExposure`, without the `internal` warning.
 */
export const collectStepExposureDiagnostics = (
  workflow: WorkflowYaml,
  isManaged: boolean
): WorkflowDiagnostic[] => {
  if (isManaged) {
    return [];
  }
  let steps = workflow.steps ?? [];
  // The workflow-level fallback runs when the workflow fails, so its steps count too.
  const workflowFallbackSteps = workflow.settings?.['on-failure']?.fallback;
  if (workflowFallbackSteps) {
    steps = [...steps, ...workflowFallbackSteps];
  }
  const managedOnlyStepTypes = new Set(
    collectAllSteps(steps)
      .map(({ type }) => type)
      .filter((stepType) => getStepExposure(stepType) === 'managed_only')
  );

  return [...managedOnlyStepTypes].map((stepType) => ({
    severity: 'error',
    message: getManagedOnlyStepMessage(stepType),
    source: 'step-exposure',
    ruleId: 'managedOnlyStepType',
  }));
};
