/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

const EXECUTION_CONTEXT_TYPE = 'security_solution';
const EA_NAME_PREFIX = 'entity_analytics';

const buildEaName = <TSuffix extends string>(
  suffix: TSuffix
): `${typeof EA_NAME_PREFIX}:${TSuffix}` => `${EA_NAME_PREFIX}:${suffix}`;

export const EA_EXECUTION_CONTEXT_NAMES = {
  ENTITY_MAINTAINERS_TASK: buildEaName('entity_maintainers_task'),
  ENTITY_STORE_EXTRACT_TASK: buildEaName('entity_store_extract_task'),
  ENTITY_STORE_HISTORY_SNAPSHOT_TASK: buildEaName('entity_store_history_snapshot_task'),
  ENTITY_STORE_STATUS_REPORT_TASK: buildEaName('entity_store_status_report_task'),
} as const;

export type EaExecutionContextName =
  (typeof EA_EXECUTION_CONTEXT_NAMES)[keyof typeof EA_EXECUTION_CONTEXT_NAMES];

/** Builds a server-side Security Solution Entity Analytics execution context payload. */
export const buildEaExecutionContext = (
  name: EaExecutionContextName,
  id: string
): KibanaExecutionContext => ({
  type: EXECUTION_CONTEXT_TYPE,
  name,
  id,
});
