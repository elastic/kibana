/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LineCounter } from 'yaml';
import type { WorkflowLookup, YamlValidationResult } from '@kbn/workflows-yaml';
import {
  getInternalStepMessage,
  getManagedOnlyStepMessage,
} from '../../../../common/lib/collect_step_exposure_diagnostics';
import { getStepExposure } from '../../../../common/schema';

/** Flags `internal` (warning) and `managed_only` (error) steps in workflows that aren't managed. */
export const validateStepExposure = (
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter,
  isManaged: boolean
): YamlValidationResult[] => {
  if (isManaged) {
    return [];
  }

  return Object.values(workflowLookup.steps).flatMap((step): YamlValidationResult[] => {
    const exposure = getStepExposure(step.stepType);
    const range = step.propInfos.type?.valueNode.range;
    if (exposure === 'open' || !range) {
      return [];
    }

    const [startOffset, endOffset] = range;
    const startPos = lineCounter.linePos(startOffset);
    const endPos = lineCounter.linePos(endOffset);
    const isManagedOnly = exposure === 'managed_only';

    return [
      {
        id: `step-exposure-${step.stepId}-${startPos.line}-${startPos.col}`,
        owner: 'step-exposure-validation',
        ruleId: isManagedOnly ? 'managedOnlyStepType' : 'internalStepType',
        severity: isManagedOnly ? 'error' : 'warning',
        message: isManagedOnly
          ? getManagedOnlyStepMessage(step.stepType)
          : getInternalStepMessage(step.stepType),
        hoverMessage: null,
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
      },
    ];
  });
};
