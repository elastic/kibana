/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInlineActionStepDefinition,
  type InlineActionStepType,
  type InlineWorkflowActionDraft,
} from '@kbn/alerting-v2-rule-form';
import { v4 as uuidv4 } from 'uuid';

export const buildInlineActionDraft = (
  stepType: InlineActionStepType
): InlineWorkflowActionDraft => {
  const definition = getInlineActionStepDefinition(stepType);
  if (!definition) {
    throw new Error(`Unknown inline action step type: ${stepType}`);
  }
  return {
    id: uuidv4(),
    source: 'inline',
    workflowName: `${definition.label} notification`,
    steps: [
      {
        id: uuidv4(),
        stepType: definition.id,
        stepName: 'notify',
        connectorId: null,
        params: definition.paramsTemplate,
      },
    ],
  };
};
