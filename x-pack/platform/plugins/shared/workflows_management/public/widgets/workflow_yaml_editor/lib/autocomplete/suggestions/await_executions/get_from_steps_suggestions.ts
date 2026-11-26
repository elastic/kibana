/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isScalar, isSeq } from 'yaml';
import { monaco } from '@kbn/code-editor';
import { WORKFLOW_AWAIT_EXECUTIONS_STEP_TYPE } from '@kbn/workflows';
import { buildWorkflowLookup } from '../../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { getAwaitableStepNames } from '../../../../../../features/validate_workflow_yaml/lib/validate_await_executions_references';
import type { AutocompleteContext } from '../../context/autocomplete.types';

const isInFromSteps = ({ focusedStepInfo, path }: AutocompleteContext): boolean => {
  if (focusedStepInfo?.stepType !== WORKFLOW_AWAIT_EXECUTIONS_STEP_TYPE) {
    return false;
  }
  const withIndex = path.lastIndexOf('with');
  return withIndex >= 0 && path[withIndex + 1] === 'from-steps';
};

/**
 * Suggests the step names a `workflow.awaitExecutions` step can list in `from-steps`: earlier
 * steps that are or contain a `workflow.executeAsync` step and are not already listed.
 */
export function getFromStepsSuggestions(
  autocompleteContext: AutocompleteContext
): monaco.languages.CompletionItem[] | null {
  const { focusedStepInfo, yamlDocument, yamlLineCounter, range } = autocompleteContext;
  if (!focusedStepInfo || !yamlLineCounter || !isInFromSteps(autocompleteContext)) {
    return null;
  }

  const fromStepsNode = yamlDocument.getIn([...focusedStepInfo.path, 'with', 'from-steps'], true);
  const isList = isSeq(fromStepsNode);
  const listedNames = new Set(
    isList
      ? fromStepsNode.items.flatMap((item) =>
          isScalar(item) && typeof item.value === 'string' ? [item.value] : []
        )
      : []
  );

  const workflowLookup = buildWorkflowLookup(yamlDocument, yamlLineCounter);
  const awaitStep = workflowLookup.steps[focusedStepInfo.stepId] ?? focusedStepInfo;

  return getAwaitableStepNames(awaitStep, workflowLookup)
    .filter((stepName) => !listedNames.has(stepName))
    .map((stepName, index) => ({
      label: stepName,
      kind: monaco.languages.CompletionItemKind.Reference,
      insertText: isList ? stepName : `[${stepName}]`,
      range,
      detail: `Await executions started by "${stepName}"`,
      sortText: String(index).padStart(4, '0'),
    }));
}
