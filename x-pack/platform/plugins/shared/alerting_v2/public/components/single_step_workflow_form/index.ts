/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { SINGLE_STEP_WORKFLOW_TAG } from './constants';
export {
  buildSingleStepWorkflowYaml,
  InvalidSingleStepWorkflowError,
} from './helpers/build_workflow_yaml';
export {
  DISPATCH_PAYLOAD_VARIABLES,
  SINGLE_STEP_WORKFLOW_TYPES,
  getDefaultSingleStepWorkflowType,
  getSingleStepWorkflowType,
} from './registry';
export type { PayloadVariable, SingleStepWorkflowType } from './registry';
export { SingleStepWorkflowForm } from './single_step_workflow_form';
export type {
  CreateWorkflowFormValue,
  ExistingWorkflowFormValue,
  SingleStepWorkflowFormValue,
  SingleStepWorkflowTypeId,
} from './types';

import React from 'react';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import type { ExistingWorkflowFormValue, SingleStepWorkflowFormValue } from './types';

const LazySingleStepWorkflowForm = React.lazy(() =>
  import('./single_step_workflow_form').then((m) => ({ default: m.SingleStepWorkflowForm }))
);

export const createSingleStepWorkflowFormService =
  (): RuleFormServices<SingleStepWorkflowFormValue>['workflowForm'] => ({
    Component: LazySingleStepWorkflowForm,
    defaultValue: (): ExistingWorkflowFormValue => ({ mode: 'existing', workflowId: null }),
  });
