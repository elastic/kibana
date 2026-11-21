/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import type { SchemaService } from '../lib/schema_service';
import { checkIntegrationTool } from './check_integration_tool';
import { listSavedQueriesTool } from './list_saved_queries_tool';
import { getTableSchemaTool } from './get_table_schema_tool';
import { runLiveQueryTool } from './run_live_query_tool';
import { getLiveQueryResultsTool } from './get_live_query_results_tool';
import { listPacksTool } from './list_packs_tool';
import { resolveAgentIdsTool } from './resolve_agent_ids_tool';

export const registerAgentBuilderTools = (
  agentBuilder: AgentBuilderPluginSetup,
  osqueryContext: OsqueryAppContext,
  schemaService: SchemaService,
  logger: Logger
): void => {
  agentBuilder.tools.register(checkIntegrationTool(osqueryContext, logger));
  agentBuilder.tools.register(listSavedQueriesTool(osqueryContext, logger));
  agentBuilder.tools.register(getTableSchemaTool(osqueryContext, logger, schemaService));
  agentBuilder.tools.register(runLiveQueryTool(osqueryContext, logger, schemaService));
  agentBuilder.tools.register(getLiveQueryResultsTool(osqueryContext, logger));
  agentBuilder.tools.register(listPacksTool(osqueryContext, logger));
  agentBuilder.tools.register(resolveAgentIdsTool(osqueryContext, logger));
  logger.info(
    'Osquery Agent Builder tools registered (check_integration, list_saved_queries, get_table_schema, run_live_query, get_live_query_results, list_packs, resolve_agent_ids)'
  );
};
