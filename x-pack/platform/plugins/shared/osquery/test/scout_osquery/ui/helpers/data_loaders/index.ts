/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { OsqueryDataGenerator } from './osquery_data_generator';
export type { GeneratedAgent, OsqueryDataGeneratorOptions } from './osquery_data_generator';

export { indexActionResponses } from './index_action_responses';
export type {
  IndexedActionResponsesResult,
  IndexActionResponsesOptions,
  IndexedActionResponseDoc,
} from './index_action_responses';

export { indexResultRows } from './index_result_rows';
export type {
  IndexedResultRowsResult,
  IndexResultRowsOptions,
  OsqueryResultRow,
  IndexedResultRowDoc,
} from './index_result_rows';

export { indexScheduledPackResults } from './index_scheduled_pack_results';
export type {
  IndexedScheduledPackResult,
  IndexScheduledPackResultsOptions,
} from './index_scheduled_pack_results';

export { mockFleetAgents } from './mock_fleet_agents';
export type {
  AgentPolicyResponseItem,
  AgentsResponse,
  MockAgentPlatform,
  MockAgentStatus,
  MockFleetAgentsOptions,
  MockFleetAgentsResult,
} from './mock_fleet_agents';
