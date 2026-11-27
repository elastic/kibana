/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type WorkflowsConfig = Record<string, unknown>;

export type WorkflowsSecrets = Record<string, unknown>;

export type AlertStateId = 'new' | 'ongoing' | 'recovered';
export type AlertStates = Record<AlertStateId, boolean>;

export interface WorkflowsActionParams {
  subAction: string;
  subActionParams: {
    workflowId: string;
    summaryMode?: boolean;
    alertStates?: AlertStates;
  };
}
