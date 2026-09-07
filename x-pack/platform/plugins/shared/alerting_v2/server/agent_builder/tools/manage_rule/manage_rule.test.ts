/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000001',
}));

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { manageRuleTool } from './manage_rule';
import { AGENT_BUILDER_TAG } from '../../common/constants';

const getEsqlQueryMock = (ctx: ToolHandlerContextMock) =>
  ctx.esClient.asCurrentUser.esql.query as unknown as jest.Mock;

const getFieldCapsMock = (ctx: ToolHandlerContextMock) =>
  ctx.esClient.asCurrentUser.fieldCaps as unknown as jest.Mock;

const getBulkGetMock = (ctx: ToolHandlerContextMock) =>
  ctx.savedObjectsClient.bulkGet as unknown as jest.Mock;

// set_query resolves the rule's time field from the source index via fieldCaps.
// Default to an index that exposes @timestamp so query-based operations don't
// fail time-field resolution.
const mockResolvableTimeField = (ctx: ToolHandlerContextMock) =>
  getFieldCapsMock(ctx).mockResolvedValueOnce({ fields: { '@timestamp': { date: {} } } });

const createContext = (): ToolHandlerContextMock => {
  const ctx = agentBuilderMocks.tools.createHandlerContext();
  ctx.attachments.add.mockResolvedValue({
    id: 'mock-attachment-id',
    current_version: 1,
  } as never);
  ctx.attachments.update.mockResolvedValue({
    id: 'mock-attachment-id',
    current_version: 2,
  } as never);
  getBulkGetMock(ctx).mockImplementation(async (objects: Array<{ id: string; type: string }>) => ({
    saved_objects: objects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      attributes: {},
      references: [],
    })),
  }));
  return ctx;
};

const createLogger = (): jest.Mocked<
  Pick<LoggerServiceContract, 'debug' | 'info' | 'warn' | 'error' | 'forSubsystem'>
> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forSubsystem: jest.fn(),
});

describe('manageRuleTool', () => {
  let logger: ReturnType<typeof createLogger>;
  let tool: ReturnType<typeof manageRuleTool>;

  beforeEach(() => {
    logger = createLogger();
    tool = manageRuleTool({ logger: logger as unknown as LoggerServiceContract });
  });

  it('describes operations from the schema helpers', () => {
    expect(tool.description).toContain('Use `set_metadata`');
    expect(tool.description).toContain('Use `set_dashboards`');
    expect(tool.description).toContain('Use `set_runbook`');
    expect(tool.description).toContain('data: { dashboardId }');
    expect(tool.description).not.toMatch(/1\. set_metadata/);
  });

  describe('handler', () => {
    it('creates a new rule attachment with valid operations', async () => {
      const ctx = createContext();
      getEsqlQueryMock(ctx).mockResolvedValueOnce({
        columns: [
          { name: 'host.name', type: 'keyword' },
          { name: 'avg_cpu', type: 'double' },
        ],
        values: [],
      });
      mockResolvableTimeField(ctx);

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'CPU Alert', description: 'High CPU' },
            { operation: 'set_kind', kind: 'alert' },
            {
              operation: 'set_query',
              query: {
                format: 'standalone',
                breach: { query: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name' },
              },
            },
          ],
        },
        ctx
      );

      expect(ctx.attachments.add).toHaveBeenCalledTimes(1);
      expect(ctx.attachments.update).not.toHaveBeenCalled();
      expect(result).toHaveProperty('results');
      const { results } = result as {
        results: Array<{ type: string; data?: { ruleAttachment?: { ruleId?: string } } }>;
      };
      expect(results[0].type).toBe(ToolResultType.other);

      // Pre-assigned rule ID is returned in the tool result
      expect(results[0].data?.ruleAttachment?.ruleId).toBeDefined();
      expect(typeof results[0].data?.ruleAttachment?.ruleId).toBe('string');

      // The attachment data stored via add() includes the pre-assigned rule ID
      const addCall = ctx.attachments.add.mock.calls[0][0] as { data: { id?: string } };
      expect(addCall.data.id).toBeDefined();
      expect(addCall.data.id).toBe(results[0].data?.ruleAttachment?.ruleId);
    });

    it('passes esClient to executeRuleOperations for query validation', async () => {
      const ctx = createContext();
      const esqlMock = getEsqlQueryMock(ctx);
      esqlMock.mockResolvedValueOnce({
        columns: [{ name: 'count', type: 'long' }],
        values: [],
      });

      await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Test' },
            {
              operation: 'set_query',
              query: { format: 'standalone', breach: { query: 'FROM logs-* | STATS COUNT(*)' } },
            },
          ],
        },
        ctx
      );

      expect(esqlMock).toHaveBeenCalledWith({
        query: 'FROM logs-* | STATS COUNT(*) | LIMIT 0',
        format: 'json',
      });
    });

    it('returns an error result when query validation fails', async () => {
      const ctx = createContext();
      getEsqlQueryMock(ctx).mockRejectedValueOnce(new Error('Unknown index [bad-index-*]'));

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Bad Query Rule' },
            {
              operation: 'set_query',
              query: {
                format: 'standalone',
                breach: { query: 'FROM bad-index-* | STATS COUNT(*)' },
              },
            },
          ],
        },
        ctx
      );

      expect(ctx.attachments.add).not.toHaveBeenCalled();
      const { results } = result as { results: Array<{ type: string; data: { message: string } }> };
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toContain('Invalid ES|QL query');
      expect(results[0].data.message).toContain('Unknown index [bad-index-*]');
    });

    it('returns an error when creating a rule without a name', async () => {
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [{ operation: 'set_kind', kind: 'alert' }],
        },
        ctx
      );

      const { results } = result as { results: Array<{ type: string; data: { message: string } }> };
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toContain('rule name is required');
    });

    it('stores recovery_strategy and no_data_strategy from set_query', async () => {
      const ctx = createContext();
      getEsqlQueryMock(ctx).mockResolvedValueOnce({
        columns: [{ name: 'host.name', type: 'keyword' }],
        values: [],
      });
      mockResolvableTimeField(ctx);

      await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Recovery Rule' },
            { operation: 'set_kind', kind: 'alert' },
            {
              operation: 'set_query',
              query: {
                format: 'standalone',
                breach: { query: 'FROM metrics-* | WHERE cpu > 0.9' },
                recovery: { query: 'FROM metrics-* | WHERE cpu < 0.5' },
              },
              recovery_strategy: 'query',
            },
          ],
        },
        ctx
      );

      const addCall = ctx.attachments.add.mock.calls[0][0] as {
        data: { recovery_strategy?: string };
      };
      expect(addCall.data.recovery_strategy).toBe('query');
    });

    it('stores no_data_strategy and no_data from set_query', async () => {
      const ctx = createContext();
      getEsqlQueryMock(ctx).mockResolvedValueOnce({
        columns: [{ name: 'host.name', type: 'keyword' }],
        values: [],
      });
      mockResolvableTimeField(ctx);

      await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'No-Data Rule' },
            { operation: 'set_kind', kind: 'alert' },
            {
              operation: 'set_query',
              query: {
                format: 'standalone',
                breach: { query: 'FROM metrics-* | WHERE cpu > 0.9' },
                no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name' },
              },
              no_data_strategy: 'last_known_status',
            },
          ],
        },
        ctx
      );

      const addCall = ctx.attachments.add.mock.calls[0][0] as {
        data: { no_data_strategy?: string };
      };
      expect(addCall.data.no_data_strategy).toBe('last_known_status');
    });

    it('stores set_dashboards IDs as dashboard artifacts on the rule attachment', async () => {
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Dashboard Rule' },
            { operation: 'set_dashboards', dashboard_ids: ['dash-abc'] },
          ],
        },
        ctx
      );

      const addCall = ctx.attachments.add.mock.calls[0][0] as {
        data: {
          artifacts?: Array<{ id: string; type: string; data: { dashboardId?: string } }>;
        };
      };
      expect(addCall.data.artifacts).toEqual([
        {
          id: expect.stringMatching(/^dashboard-/),
          type: 'dashboard',
          data: { dashboardId: 'dash-abc' },
        },
      ]);

      const { results } = result as {
        results: Array<{
          type: string;
          data?: { ruleAttachment?: { dashboards?: string[] } };
        }>;
      };
      expect(results[0].type).toBe(ToolResultType.other);
      expect(results[0].data?.ruleAttachment?.dashboards).toEqual(['dash-abc']);
    });

    it('stores set_runbook markdown as a runbook artifact on the rule attachment', async () => {
      const ctx = createContext();

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Runbook Rule' },
            { operation: 'set_runbook', content: '# Restart the service' },
          ],
        },
        ctx
      );

      const addCall = ctx.attachments.add.mock.calls[0][0] as {
        data: {
          artifacts?: Array<{ id: string; type: string; data: { content?: string } }>;
        };
      };
      expect(addCall.data.artifacts).toEqual([
        {
          id: expect.stringMatching(/^runbook-/),
          type: 'runbook',
          data: { content: '# Restart the service' },
        },
      ]);

      const { results } = result as {
        results: Array<{
          type: string;
          data?: { ruleAttachment?: { runbookAttached?: boolean } };
        }>;
      };
      expect(results[0].type).toBe(ToolResultType.other);
      expect(results[0].data?.ruleAttachment?.runbookAttached).toBe(true);
    });

    it('returns an error result when a dashboard ID does not exist', async () => {
      const ctx = createContext();
      getBulkGetMock(ctx).mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'missing-dash',
            type: 'dashboard',
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [dashboard/missing-dash] not found',
            },
            attributes: {},
            references: [],
          },
        ],
      } as never);

      const result = await tool.handler(
        {
          operations: [
            { operation: 'set_metadata', name: 'Dashboard Rule' },
            { operation: 'set_dashboards', dashboard_ids: ['missing-dash'] },
          ],
        },
        ctx
      );

      expect(ctx.attachments.add).not.toHaveBeenCalled();
      const { results } = result as {
        results: Array<{ type: string; data?: { message?: string } }>;
      };
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data?.message).toMatch(
        /Dashboard saved object\(s\) not found: missing-dash/
      );
    });

    it('updates an persisted attachment when ruleAttachmentId is provided', async () => {
      const ctx = createContext();
      ctx.attachments.getAttachmentRecord.mockReturnValue({
        versions: [
          {
            data: {
              metadata: { name: 'Persisted Rule' },
              kind: 'alert',
              query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
            },
          },
        ],
      } as never);

      const result = await tool.handler(
        {
          ruleAttachmentId: 'persisting-id',
          operations: [{ operation: 'set_kind', kind: 'signal' }],
        },
        ctx
      );

      expect(ctx.attachments.update).toHaveBeenCalledTimes(1);
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      const { results } = result as { results: Array<{ type: string }> };
      expect(results[0].type).toBe(ToolResultType.other);

      // The agent-builder-assisted tag is stamped on the data persisted via update()
      const updateCall = ctx.attachments.update.mock.calls[0][1] as {
        data: { metadata?: { tags?: string[] } };
      };
      expect(updateCall.data.metadata?.tags).toContain(AGENT_BUILDER_TAG);
    });

    it('returns an error when attachment persistence fails', async () => {
      const ctx = createContext();
      ctx.attachments.add.mockResolvedValue(undefined as never);

      const result = await tool.handler(
        {
          operations: [{ operation: 'set_metadata', name: 'Failing Rule' }],
        },
        ctx
      );

      const { results } = result as { results: Array<{ type: string; data: { message: string } }> };
      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toContain('Failed to persist rule attachment');
    });
  });

  describe('logger severity', () => {
    it('logs validation errors at debug level (not warn or error)', async () => {
      const ctx = createContext();

      await tool.handler({ operations: [{ operation: 'set_kind', kind: 'alert' }] }, ctx);

      expect(logger.debug).toHaveBeenCalledWith({
        message: 'Invalid manage_rule input',
        labels: { space_id: ctx.spaceId },
      });
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs unexpected errors at warn level (not error)', async () => {
      const ctx = createContext();
      ctx.attachments.add.mockRejectedValueOnce(new Error('ES exploded'));

      await tool.handler(
        {
          operations: [{ operation: 'set_metadata', name: 'Boom' }],
        },
        ctx
      );

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Failed to manage rule',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_RULE_FAILED,
        labels: { space_id: ctx.spaceId, rule_id: expect.any(String) },
        error: expect.any(Error),
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('includes rule_id on unexpected errors when the rule is already persisted', async () => {
      const ctx = createContext();
      ctx.attachments.getAttachmentRecord.mockReturnValue({
        origin: 'rule-persisted-id',
        versions: [
          {
            data: {
              id: 'rule-persisted-id',
              kind: 'alert',
              metadata: { name: 'Existing', owner: 'observability' },
            },
          },
        ],
      } as never);
      ctx.attachments.update.mockRejectedValueOnce(new Error('ES exploded'));

      await tool.handler(
        {
          ruleAttachmentId: 'attachment-1',
          operations: [{ operation: 'set_metadata', name: 'Boom' }],
        },
        ctx
      );

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Failed to manage rule',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_RULE_FAILED,
        labels: { space_id: ctx.spaceId, rule_id: 'rule-persisted-id' },
        error: expect.any(Error),
      });
    });

    it('includes rule_id on unexpected errors when the rule is only in memory', async () => {
      const ctx = createContext();
      ctx.attachments.getAttachmentRecord.mockReturnValue({
        versions: [
          {
            data: {
              id: 'rule-in-memory-id',
              kind: 'alert',
              metadata: { name: 'Draft', owner: 'observability' },
            },
          },
        ],
      } as never);
      ctx.attachments.update.mockRejectedValueOnce(new Error('ES exploded'));

      await tool.handler(
        {
          ruleAttachmentId: 'attachment-1',
          operations: [{ operation: 'set_metadata', name: 'Boom' }],
        },
        ctx
      );

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Failed to manage rule',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_RULE_FAILED,
        labels: { space_id: ctx.spaceId, rule_id: 'rule-in-memory-id' },
        error: expect.any(Error),
      });
    });
  });
});
