/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-space advanced setting that gates publishing `alerting.v1.alertStatusChanged`.
 * Off by default: while it is off the task runner never builds or publishes the event.
 */
export const ALERT_STATUS_WORKFLOW_TRIGGER_SETTING_ID =
  'alerting:v1:alertStatusWorkflowTrigger:enabled';
