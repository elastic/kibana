/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A "scope" groups task types that should share a sub-budget of the global
 * Elasticsearch request category budget (see `es_request_categories`). The
 * per-scope limits themselves are operator-configured under
 * `xpack.task_manager.es_request_limits.scopes.<scope>`; this file only owns the
 * *membership* map — which task types belong to which scope.
 *
 * Membership is resolved from the task **type**, which is fixed and reliable,
 * rather than from per-task-instance data (e.g. `TaskInstance.scope`) that may be
 * missing or wrong on individual documents. Keeping the map here also lets an
 * operator cap a group's Elasticsearch load without the owning team changing
 * their task definitions.
 */
export interface EsRequestScopeGroup {
  /** The scope name; matches a key under `es_request_limits.scopes`. */
  scope: string;
  /** Task types whose name starts with any of these prefixes belong to the scope. */
  taskTypePrefixes?: string[];
  /** Exact task types that belong to the scope. */
  taskTypes?: string[];
}

/**
 * The hardcoded task-type → scope membership map. Add an entry here to make a
 * group eligible for an `es_request_limits.scopes.<scope>` sub-budget. First
 * matching group wins, so keep groups mutually exclusive.
 */
export const ES_REQUEST_SCOPE_GROUPS: readonly EsRequestScopeGroup[] = [
  // Alerting rule executors are registered as `alerting:${ruleType.id}`.
  { scope: 'alerting', taskTypePrefixes: ['alerting:'] },

  // Alerting v2 (ES|QL) rules all run under a single fixed task type
  // (`alerting_v2:rule_executor`, i.e. ALERTING_RULE_EXECUTOR_TASK_TYPE — not
  // imported here to avoid a task_manager -> alerting_v2 dependency). Kept as its
  // own scope so the v1 and v2 engines can be budgeted independently. The other
  // `alerting_v2:*` tasks (dispatcher, telemetry, api key invalidation) are infra,
  // not rule executions, so they are intentionally excluded.
  { scope: 'alerting_v2', taskTypes: ['alerting_v2:rule_executor'] },

  // Action executors are registered as `actions:${actionTypeId}`.
  { scope: 'actions', taskTypePrefixes: ['actions:'] },

  // For testing — exercised by the plugin API integration suite.
  { scope: 'sampleEsRequestScope', taskTypes: ['sampleTaskWithScopedEsRequestLimit'] },
];

/** The set of scope names known to the membership map, for config validation. */
export const KNOWN_ES_REQUEST_SCOPES: readonly string[] = [
  ...new Set(ES_REQUEST_SCOPE_GROUPS.map((group) => group.scope)),
];

/**
 * Resolves the Elasticsearch-request scope a task type belongs to, or
 * `undefined` when the task type is not grouped. First matching group wins.
 */
export const resolveEsRequestScope = (taskType: string): string | undefined => {
  for (const group of ES_REQUEST_SCOPE_GROUPS) {
    if (group.taskTypes?.includes(taskType)) {
      return group.scope;
    }
    if (group.taskTypePrefixes?.some((prefix) => taskType.startsWith(prefix))) {
      return group.scope;
    }
  }
  return undefined;
};
