/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from '@kbn/zod';
import { schema } from '@kbn/config-schema';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import type { RouteOptions } from '../../..';
import { KibanaMcpHttpTransport } from './kibana_mcp_http_transport';
import { listRuleTypesTool } from './tools/list_rule_types';
import { getRuleTypeParamsSchemaTool } from './tools/get_rule_type_params_schema';
import { createRuleTool } from './tools/create_rule';
import { getRuleTool } from './tools/get_rule';

const MCP_SERVER_NAME = 'kibana-alerting-mcp';
const MCP_SERVER_VERSION = '0.0.1';

export const mcpRoute = ({ router, ruleTypeRegistry, logger: loggerOpt }: RouteOptions) => {
  // ruleTypeRegistry and logger are required for this route; they are always provided by plugin.ts
  if (!ruleTypeRegistry || !loggerOpt) {
    return;
  }
  const logger = loggerOpt;

  // GET handler returns 405 so MCP clients know SSE listen channel is not supported
  // and fall back to POST-only (stateless) mode.
  router.get(
    {
      path: '/api/alerting/rule/mcp',
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'public', tags: ['mcp'] },
      validate: {},
    },
    (_context, _request, response) => {
      return response.customError({
        statusCode: 405,
        body: { message: 'SSE stream not supported. Use POST for all MCP communication.' },
      });
    }
  );

  router.post(
    {
      path: '/api/alerting/rule/mcp',
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        xsrfRequired: false,
        tags: ['mcp'],
        summary: 'MCP server for alerting rule management',
        description: `> warn
> This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.`,
      },
      validate: {
        request: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
      },
    },
    async (context, request, response) => {
      let transport: KibanaMcpHttpTransport | undefined;
      let server: McpServer | undefined;

      try {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const ruleTypes = alertingContext.listTypes();

        transport = new KibanaMcpHttpTransport({ sessionIdGenerator: undefined, logger });
        server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });

        server.registerTool(
          'list_rule_types',
          {
            description:
              'List all available alerting rule types with their IDs, names, producers, and license requirements. Call this first to discover what rules can be created.',
            inputSchema: {},
          },
          () => listRuleTypesTool(ruleTypes)
        );

        server.registerTool(
          'get_rule_type_params_schema',
          {
            description:
              'Get the params schema for a specific rule type. Use this after selecting a rule type to understand what parameters are required. The schema describes each field the user must provide.',
            inputSchema: {
              rule_type_id: z.string().describe('The rule type ID from list_rule_types'),
            },
          },
          ({ rule_type_id }) => getRuleTypeParamsSchemaTool(rule_type_id, ruleTypeRegistry)
        );

        server.registerTool(
          'create_rule',
          {
            description:
              'Create an alerting rule. Call list_rule_types and get_rule_type_params_schema first to collect all required information from the user before calling this.',
            inputSchema: {
              name: z.string().describe('A descriptive name for the rule'),
              rule_type_id: z.string().describe('The rule type ID from list_rule_types'),
              consumer: z
                .string()
                .describe(
                  'The consumer/owner of the rule (e.g. "alerts", "stackAlerts", "infrastructure", "logs", "apm")'
                ),
              schedule_interval: z
                .string()
                .describe('How often to run the rule, e.g. "1m", "5m", "1h"'),
              params: z
                .string()
                .describe(
                  'JSON string of rule-type-specific parameters. Use get_rule_type_params_schema to learn what fields are needed, then collect them from the user one by one.'
                ),
              tags: z.string().optional().describe('Optional comma-separated list of tags'),
            },
          },
          (args) => createRuleTool(args, rulesClient)
        );

        server.registerTool(
          'get_rule',
          {
            description: 'Get an alerting rule by ID to verify it was created correctly.',
            inputSchema: { id: z.string().describe('The rule ID returned by create_rule') },
          },
          ({ id }) => getRuleTool(id, rulesClient)
        );

        request.events.aborted$.subscribe(async () => {
          await transport?.close().catch((error) => {
            logger.error('MCP Server: Error closing transport', { error });
          });
          await server?.close().catch((error) => {
            logger.error('MCP Server: Error closing server', { error });
          });
        });

        await server.connect(transport);
        return await transport.handleRequest(request, response);
      } catch (error) {
        logger.error('MCP Server: Error handling request', { error });
        try {
          await transport?.close();
        } catch (closeError) {
          logger.error('MCP Server: Error closing transport during error handling', {
            error: closeError,
          });
        }
        if (server) {
          try {
            await server.close();
          } catch (closeError) {
            logger.error('MCP Server: Error closing server during error handling', {
              error: closeError,
            });
          }
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
            attributes: { code: ErrorCode.InternalError },
          },
        });
      }
    }
  );
};
