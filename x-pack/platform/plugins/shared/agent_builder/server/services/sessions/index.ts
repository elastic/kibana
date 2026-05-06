/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { SessionServiceImpl } from './session_service';
export type { SessionServiceDeps } from './session_service';
export {
  registerAgentSessionTriggerTasks,
  scheduleSessionScheduledTask,
  scheduleSessionReminderTask,
  cancelSessionTriggerTask,
  scheduledTaskId,
  reminderTaskId,
  AGENT_SESSION_SCHEDULED_TASK_TYPE,
  AGENT_SESSION_REMINDER_TASK_TYPE,
} from './trigger_tasks';
export type {
  AgentSessionScheduledTaskParams,
  AgentSessionReminderTaskParams,
} from './trigger_tasks';
export {
  AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID,
  registerAgentSessionAlertConnectorType,
} from './alert_handler';
