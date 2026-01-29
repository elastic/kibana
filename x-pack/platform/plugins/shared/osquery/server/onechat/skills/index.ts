/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Osquery OneChat Skills Module
 *
 * This module provides AI agent skills for interacting with Osquery functionality.
 * Skills are designed to work with the OneChat/Agent Builder framework and expose
 * LangChain-compatible tools for:
 *
 * - Running live osquery queries against agents
 * - Managing and retrieving osquery packs
 * - Working with saved queries
 * - Fetching query results
 * - Exploring osquery table schemas
 * - Checking osquery integration status
 *
 * @example
 * ```typescript
 * import { getOsquerySkill } from './skills';
 *
 * // Create the unified osquery skill (recommended)
 * const osquerySkill = getOsquerySkill(() => osqueryAppContext);
 *
 * // Or use individual skills for fine-grained control
 * const liveQuerySkill = getLiveQuerySkill(() => osqueryAppContext);
 * const packsSkill = getPacksSkill(() => osqueryAppContext);
 * ```
 *
 * @packageDocumentation
 */

export { getLiveQuerySkill } from './live_query_skill';
export { getOsquerySkill } from './osquery_skill';
export { getPacksSkill } from './packs_skill';
export { getSavedQueriesSkill } from './saved_queries_skill';
export { getResultsSkill } from './results_skill';
export { getSchemaSkill } from './schema_skill';
export { getStatusSkill } from './status_skill';
export type { GetOsqueryAppContextFn } from './utils';

