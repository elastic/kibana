/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SingleStepWorkflowTypeId = string;

export interface ExistingWorkflowFormValue {
  mode: 'existing';
  workflowId: string | null;
}

export interface CreateWorkflowFormValue {
  mode: 'create';
  typeId: SingleStepWorkflowTypeId;
  connectorId: string | null;
  params: string;
  name?: string;
}

export type SingleStepWorkflowFormValue = ExistingWorkflowFormValue | CreateWorkflowFormValue;
