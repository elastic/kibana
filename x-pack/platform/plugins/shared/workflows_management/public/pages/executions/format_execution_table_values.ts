/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { triggerSchemas } from '../../trigger_schemas';

const WORKFLOW_STEP_TRIGGER_LABEL = i18n.translate(
  'workflows.executionsPage.trigger.workflowStep',
  {
    defaultMessage: 'Workflow step',
  }
);

export const formatExecutionTriggerLabel = (
  triggeredBy: string | undefined
): string | undefined => {
  if (!triggeredBy) {
    return undefined;
  }

  if (triggeredBy === 'workflow-step') {
    return WORKFLOW_STEP_TRIGGER_LABEL;
  }

  return triggerSchemas.getTriggerName(triggeredBy);
};
