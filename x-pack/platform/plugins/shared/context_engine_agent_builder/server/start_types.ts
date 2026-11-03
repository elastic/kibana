/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart } from '@kbn/core/server';
import type { ContextEngineTasksStart } from '@kbn/context-engine-plugin/server/tasks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

/**
 * What the Context Engine agent builder tools use of Core and Context Engine: the parts Kibana and a
 * task pod both provide (the tasks contracts), so the same tools run in both. Security stays the full
 * contract type because the shared workflow privilege checks are typed with it; they use only
 * `authz.actions` and `checkPrivilegesWithRequest` (see the tasks entry).
 */
export type ToolsCoreStart = Pick<
  CoreTasksStart,
  'savedObjects' | 'uiSettings' | 'http' | 'elasticsearch'
>;
export type ToolsSecurityStart = SecurityPluginStart;
export type ToolsContextEngineStart = ContextEngineTasksStart;
