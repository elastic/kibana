/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LineCounter } from 'yaml';
import { getDeprecatedStepMessage } from '@kbn/workflows';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { getDeprecatedStepMetadata } from '../../../../common/schema';
import type { WorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

export function validateDeprecatedStepTypes(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  for (const step of Object.values(workflowLookup.steps)) {
    const deprecation = getDeprecatedStepMetadata(step.stepType);
    const typeProp = step.propInfos.type;

    if (deprecation && typeProp?.valueNode.range) {
      const [startOffset, endOffset] = typeProp.valueNode.range;
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);
      const message = getDeprecatedStepMessage(step.stepType, deprecation);

      results.push({
        id: `deprecated-step-type-${step.stepId}-${startPos.line}-${startPos.col}`,
        owner: 'deprecated-step-validation',
        ruleId: 'deprecatedStepType',
        severity: 'warning',
        message,
        hoverMessage: null,
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
      });
    }
  }

  return results;
}
