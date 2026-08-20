/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import type { SchemaService } from '../lib/schema_service';
import { buildToolContext, toolRequest } from './test_helpers';
import { checkIntegrationTool } from './check_integration_tool';
import { registerAgentBuilderTools } from './register_tools';
import { listSavedQueriesTool } from './list_saved_queries_tool';
import { getTableSchemaTool } from './get_table_schema_tool';
import { runLiveQueryTool } from './run_live_query_tool';
import { getLiveQueryResultsTool } from './get_live_query_results_tool';
import { listPacksTool } from './list_packs_tool';
import { resolveAgentIdsTool } from './resolve_agent_ids_tool';
import { OSQUERY_TOOL_PRIVILEGES, type OsqueryToolPrivilege } from './tool_authz';

const schemaService = () =>
  ({
    getSchema: jest.fn().mockResolvedValue({
      data: [{ name: 'processes', description: '', platforms: ['darwin'], columns: [] }],
      version: '5.19.0',
    }),
  } as unknown as SchemaService);

type ToolFactory = (context: OsqueryAppContext) => {
  handler: (input: never, deps: never) => Promise<unknown>;
};

/**
 * Every Osquery Agent Builder tool is a second entry point to data an HTTP
 * route already guards. Agent Builder does NOT apply the route's
 * `requiredPrivileges`, so each tool must assert the same privilege itself.
 *
 * This table is the contract: a tool that stops checking its privilege fails
 * its own row, and a newly registered tool missing from the table fails the
 * completeness test — neither can reach review as a silently unauthorized
 * capability.
 */
const TOOL_PRIVILEGE_CONTRACT: Array<{
  name: string;
  privilege: OsqueryToolPrivilege;
  /** Route this tool mirrors, for reviewers tracing parity. */
  route: string;
  factory: ToolFactory;
  input: Record<string, unknown>;
}> = [
  {
    name: 'check_integration',
    privilege: 'read',
    route: 'GET /internal/osquery/status',
    factory: (context) => checkIntegrationTool(context, loggerMock.create()) as never,
    input: {},
  },
  {
    name: 'list_saved_queries',
    privilege: 'readSavedQueries',
    route: 'GET /api/osquery/saved_queries',
    factory: (context) => listSavedQueriesTool(context, loggerMock.create()) as never,
    input: { page: 1, page_size: 20 },
  },
  {
    name: 'list_packs',
    privilege: 'readPacks',
    route: 'GET /api/osquery/packs',
    factory: (context) => listPacksTool(context, loggerMock.create()) as never,
    input: { page: 1, page_size: 20 },
  },
  {
    name: 'get_table_schema',
    privilege: 'read',
    route: 'GET /internal/osquery/schemas/osquery',
    factory: (context) =>
      getTableSchemaTool(context, loggerMock.create(), schemaService()) as never,
    input: { table_name: 'processes' },
  },
  {
    name: 'resolve_agent_ids',
    privilege: 'read',
    route: 'GET /internal/osquery/fleet_wrapper/agents',
    factory: (context) => resolveAgentIdsTool(context, loggerMock.create()) as never,
    input: { hostnames: ['SRV-DC01'] },
  },
  {
    name: 'run_live_query',
    privilege: 'writeLiveQueries',
    route: 'POST /api/osquery/live_queries',
    factory: (context) => runLiveQueryTool(context, loggerMock.create(), schemaService()) as never,
    input: { query: 'SELECT pid FROM processes', agent_ids: ['agent-1'] },
  },
  {
    name: 'get_live_query_results',
    privilege: 'readLiveQueries',
    route: 'GET /api/osquery/live_queries/{id}/results/{actionId}',
    factory: (context) => getLiveQueryResultsTool(context, loggerMock.create()) as never,
    input: { action_id: 'action-1' },
  },
];

const firstResult = (result: unknown) => {
  if (!isToolHandlerStandardReturn(result as never)) {
    throw new Error('Expected standard handler return');
  }

  return (result as { results: Array<{ type: string; data: { message?: string } }> }).results[0];
};

const invoke = async (
  entry: (typeof TOOL_PRIVILEGE_CONTRACT)[number],
  grantedPrivileges: string[]
) => {
  const { context } = buildToolContext({ grantedPrivileges });

  return entry.factory(context).handler(
    entry.input as never,
    {
      request: toolRequest,
      spaceId: 'default',
    } as never
  );
};

describe('Osquery Agent Builder tool privilege parity', () => {
  it.each(TOOL_PRIVILEGE_CONTRACT)(
    '$name denies a caller without $privilege (route parity: $route)',
    async (entry) => {
      const first = firstResult(await invoke(entry, []));

      expect(first.type).toBe('error');
      expect(first.data.message).toMatch(/Insufficient Osquery privileges/);
    }
  );

  it.each(TOOL_PRIVILEGE_CONTRACT)(
    '$name passes the privilege gate once $privilege is granted',
    async (entry) => {
      const first = firstResult(await invoke(entry, [...OSQUERY_TOOL_PRIVILEGES[entry.privilege]]));

      // The handler may still fail downstream against mocked services; what
      // matters is that the privilege gate no longer rejects it.
      expect(first.data.message ?? '').not.toMatch(/Insufficient Osquery privileges/);
    }
  );

  it('get_live_query_results is denied for a caller with osquery-read only', async () => {
    const entry = TOOL_PRIVILEGE_CONTRACT.find((e) => e.name === 'get_live_query_results');
    if (!entry) throw new Error('missing get_live_query_results contract row');

    const first = firstResult(await invoke(entry, ['osquery-read']));

    expect(first.type).toBe('error');
    expect(first.data.message).toMatch(/Insufficient Osquery privileges/);
  });

  it('covers every registered Osquery Agent Builder tool', () => {
    // Derive the registered set from the real registration entrypoint, not a
    // copy — a newly registered tool must fail this test until it has a row.
    const logger = loggerMock.create();
    const registered: string[] = [];
    const agentBuilder = {
      tools: {
        register: (tool: { id: string }) => registered.push(tool.id),
      },
    };
    registerAgentBuilderTools(
      agentBuilder as never,
      buildToolContext().context,
      schemaService() as never,
      logger
    );

    const contractIds = TOOL_PRIVILEGE_CONTRACT.map((entry) => {
      const tool = entry.factory(buildToolContext().context) as unknown as { id: string };

      return tool.id;
    });

    expect(contractIds.sort()).toEqual(registered.sort());
  });
});
