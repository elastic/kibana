/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { AlertInstanceContext } from './src/alert_instance';

export type { TrackedLifecycleAlertState, WrappedLifecycleRuleState } from './src/lifecycle_state';
export { wrappedStateRt } from './src/lifecycle_state';

export type { RuleTaskParams } from './src/rule_task_instance';
export { ActionsCompletion, ruleParamsSchema } from './src/rule_task_instance';

export type {
  LatestTaskStateSchema as RuleTaskState,
  MutableLatestTaskStateSchema as MutableRuleTaskState,
  LatestRawAlertInstanceSchema as RawAlertInstance,
  LatestAlertInstanceMetaSchema as AlertInstanceMeta,
  MutableLatestAlertInstanceMetaSchema as MutableAlertInstanceMeta,
  LatestAlertInstanceStateSchema as AlertInstanceState,
  LatestThrottledActionSchema as ThrottledActions,
  LatestLastScheduledActionsSchema as LastScheduledActions,
} from './src/task_state';
export { stateSchemaByVersion, emptyState as emptyTaskState } from './src/task_state';
