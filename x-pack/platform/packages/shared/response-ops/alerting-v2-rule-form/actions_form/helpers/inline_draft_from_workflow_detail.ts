/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import type { WorkflowDetailDto, WorkflowYaml } from '@kbn/workflows';
import { getDefaultInlineActionStepDefinition, getInlineActionStepDefinition } from '../registry';
import type { InlineWorkflowActionDraft, InlineWorkflowStepDraft } from '../types';
import { buildInlineWorkflowStepDraft } from './build_inline_workflow_step_draft';

const resolveStepType = (stepType: string): string | null => {
  if (getInlineActionStepDefinition(stepType)) {
    return stepType;
  }
  // Map plain connector types onto registered inline step definitions when possible.
  if (stepType === 'slack' || stepType.startsWith('slack.')) {
    return getInlineActionStepDefinition('slack2.sendMessage') ? 'slack2.sendMessage' : null;
  }
  if (stepType === 'email' || stepType.startsWith('email.')) {
    return getInlineActionStepDefinition('email') ? 'email' : null;
  }
  return null;
};

const stepFromDefinitionStep = (step: {
  name?: string;
  type?: string;
  'connector-id'?: string;
  with?: Record<string, unknown>;
}): InlineWorkflowStepDraft | null => {
  if (typeof step.type !== 'string') {
    return null;
  }
  const stepType = resolveStepType(step.type);
  if (!stepType) {
    return null;
  }
  const definition = getInlineActionStepDefinition(stepType);
  if (!definition) {
    return null;
  }
  return {
    id: uuidv4(),
    stepType: definition.id,
    stepName: typeof step.name === 'string' && step.name.trim() ? step.name : 'notify',
    connectorId: typeof step['connector-id'] === 'string' ? step['connector-id'] : null,
    params:
      step.with && typeof step.with === 'object'
        ? stringify(step.with)
        : definition.paramsTemplate,
  };
};

export const inlineDraftFromWorkflowDetail = (
  workflow: Pick<WorkflowDetailDto, 'id' | 'name' | 'definition'> & {
    definition?: WorkflowYaml | null;
  }
): InlineWorkflowActionDraft => {
  const definitionSteps = (workflow.definition?.steps ?? []) as Array<{
    name?: string;
    type?: string;
    'connector-id'?: string;
    with?: Record<string, unknown>;
  }>;

  const steps = definitionSteps
    .map(stepFromDefinitionStep)
    .filter((step): step is InlineWorkflowStepDraft => step !== null);

  return {
    id: workflow.id,
    source: 'inline',
    workflowName: workflow.name,
    steps:
      steps.length > 0
        ? steps
        : [buildInlineWorkflowStepDraft(getDefaultInlineActionStepDefinition().id)],
  };
};
