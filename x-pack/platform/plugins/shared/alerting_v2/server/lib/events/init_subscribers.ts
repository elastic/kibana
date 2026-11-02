/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Container } from 'inversify';
import { AlertActionWorkflowSubscriber } from './alert_action_workflow_subscriber/alert_action_workflow_subscriber';
import { RuleWorkflowSubscriber } from './rule_workflow_subscriber/rule_workflow_subscriber';
import { RuleChangesHistorySubscriber } from './rule_changes_history_subscriber/rule_changes_history_subscriber';
import { RuleExecutorWorkflowSubscriber } from './rule_executor_workflow_subscriber/rule_executor_workflow_subscriber';
import { AlertStatusChangedWorkflowSubscriber } from './alert_status_changed_workflow_subscriber/alert_status_changed_workflow_subscriber';
import { RuleTelemetrySubscriber } from './rule_telemetry_subscriber/rule_telemetry_subscriber';
import { ActionPolicyTelemetrySubscriber } from './action_policy_telemetry_subscriber/action_policy_telemetry_subscriber';

/**
 * Activates the event-bus subscribers that react to what Kibana-side requests publish (rule
 * lifecycle, alert actions). Task-side subscribers are started by `initTaskSubscribers`. Intended to be invoked from the
 * plugin's `OnStart` callback once every start-time dependency
 * (`workflowsExtensions`, core http, etc.) is available, so handlers
 * never run against partially-initialised collaborators.
 *
 */
export function initSubscribers(container: Container): void {
  container.get(AlertActionWorkflowSubscriber).start();
  container.get(RuleWorkflowSubscriber).start();
  container.get(RuleChangesHistorySubscriber).start();
  container.get(RuleTelemetrySubscriber).start();
  container.get(ActionPolicyTelemetrySubscriber).start();
}

/**
 * Subscribers that react to events published while a task runs (rule execution results). They
 * belong to the task runtime, so they start wherever tasks run: Kibana or a task pod.
 */
export function initTaskSubscribers(container: Container): void {
  container.get(RuleExecutorWorkflowSubscriber).start();
  // Published by the rule executor and, in Kibana, by the alert events client.
  container.get(AlertStatusChangedWorkflowSubscriber).start();
}
