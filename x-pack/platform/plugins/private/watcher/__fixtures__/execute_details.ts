/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ExecuteDetails {
  triggerData?: {
    triggeredTime?: string;
    scheduledTime?: string;
  };
  ignoreCondition: boolean;
  actionModes?: {
    [key: string]: string;
  };
  recordExecution?: boolean;
}

export const getExecuteDetails = ({
  triggerData = {},
  ignoreCondition = false,
  actionModes = {},
  recordExecution,
}: Partial<ExecuteDetails> = {}): ExecuteDetails => ({
  triggerData,
  ignoreCondition,
  actionModes,
  recordExecution,
});
