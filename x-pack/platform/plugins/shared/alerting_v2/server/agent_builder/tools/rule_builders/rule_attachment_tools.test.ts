/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import { RULE_BUILDER_TYPES, THRESHOLD_BUILDER_TYPE } from '@kbn/alerting-v2-rule-builders';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import {
  createAttachmentRecord,
  mockAttachmentWrites,
} from '../rule_operations/rule_attachment.mock';
import { mockDateFields, mockEsqlColumns } from './es_client.mock';
import { getRuleAttachmentTools } from './rule_attachment_tools';

const builder = RULE_BUILDER_TYPES[THRESHOLD_BUILDER_TYPE];

const params = {
  indexPattern: 'metrics-*',
  timeField: '@timestamp',
  stats: [{ label: 'avg_cpu', aggregation: 'avg', field: 'system.cpu.total.norm.pct' }],
  evaluations: [],
  alertConditions: [{ metric: 'avg_cpu', comparator: '>', threshold: [0.9] }],
  conditionOperator: 'AND',
  groupByFields: ['host.name'],
};

const thresholdRule: Partial<RuleAttachmentData> = {
  id: 'rule-1',
  kind: 'alert',
  metadata: { name: 'High CPU', builder: { type: 'threshold' } },
  schedule: { every: '1m' },
  ...builder.build(params, { kind: 'alert' }),
};

const customRule: Partial<RuleAttachmentData> = {
  id: 'rule-2',
  kind: 'alert',
  metadata: { name: 'Errors' },
  time_field: '@timestamp',
  query: { base: 'FROM logs-* | STATS errors = COUNT(*)' },
};

const createContext = (data: unknown): ToolHandlerContextMock => {
  const ctx = agentBuilderMocks.tools.createHandlerContext();
  mockAttachmentWrites(ctx);
  ctx.attachments.getAttachmentRecord.mockReturnValue(createAttachmentRecord({ data }));
  mockEsqlColumns(ctx.esClient, [{ name: 'avg_cpu', type: 'double' }]);
  mockDateFields(ctx.esClient, ['@timestamp']);
  return ctx;
};

describe('getRuleAttachmentTools', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
  });

  const getTools = (data: Partial<RuleAttachmentData>) =>
    getRuleAttachmentTools({ attachmentId: 'attachment-1', data, logger: loggerService });

  const getTool = (data: Partial<RuleAttachmentData>, id: string): BuiltinAttachmentBoundedTool => {
    const tool = getTools(data).tools.find((candidate) => candidate.id === id);
    if (!tool) {
      throw new Error(`Tool "${id}" is not exposed`);
    }
    return tool;
  };

  const updateToolId = 'platform.alerting.update_threshold_rule_attachme';
  const convertToolId = 'platform.alerting.convert_to_custom_rule_attachme';

  it('gives custom ES|QL rules no tools and points them at draft_custom_rule', () => {
    const { guidance, tools } = getTools(customRule);

    expect(tools).toEqual([]);
    expect(guidance).toContain('`platform.alerting.draft_custom_rule`');
  });

  it('gives builder rules the update and conversion tools, with their current params', () => {
    const { guidance, tools } = getTools(thresholdRule);

    expect(tools.map(({ id }) => id)).toEqual([updateToolId, convertToolId]);
    expect(guidance).toContain(`Current Threshold params: ${JSON.stringify(params)}`);
  });

  it('only offers conversion when the params cannot be read back from the rule', () => {
    const { guidance, tools } = getTools({
      ...thresholdRule,
      query: { base: 'FROM logs-* | LOOKUP JOIN hosts ON host.name | STATS errors = COUNT(*)' },
    });

    expect(tools.map(({ id }) => id)).toEqual([convertToolId]);
    expect(guidance).toContain("params can't be read back");
  });

  it('only offers conversion for an unknown builder', () => {
    const { tools } = getTools({
      ...thresholdRule,
      metadata: { name: 'High CPU', builder: { type: 'anomaly' } },
    });

    expect(tools.map(({ id }) => id)).toEqual([convertToolId]);
  });

  describe('update tool', () => {
    it('patches the params and regenerates the rule', async () => {
      const ctx = createContext(thresholdRule);
      const tool = getTool(thresholdRule, updateToolId);

      const result = await tool.handler({ params: { groupByFields: ['service.name'] } }, ctx);

      expect(ctx.attachments.update).toHaveBeenCalledWith(
        'attachment-1',
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'rule-1',
            schedule: { every: '1m' },
            grouping: { fields: ['service.name'] },
            metadata: { name: 'High CPU', builder: { type: 'threshold' } },
          }),
        })
      );
      expect(result).toMatchObject({
        results: [
          {
            type: ToolResultType.other,
            data: { params: { ...params, groupByFields: ['service.name'] } },
          },
        ],
      });
    });

    it('applies settings without changing the params', async () => {
      const ctx = createContext(thresholdRule);
      const tool = getTool(thresholdRule, updateToolId);

      const result = await tool.handler(
        { settings: [{ operation: 'set_schedule', every: '10m' }] },
        ctx
      );

      expect(ctx.attachments.update).toHaveBeenCalledWith(
        'attachment-1',
        expect.objectContaining({
          data: expect.objectContaining({
            schedule: { every: '10m' },
            query: thresholdRule.query,
          }),
        })
      );
      expect(result).toMatchObject({
        results: [{ type: ToolResultType.other, data: { params } }],
      });
    });

    it('requires params or settings', async () => {
      const ctx = createContext(thresholdRule);
      const tool = getTool(thresholdRule, updateToolId);

      const result = await tool.handler({}, ctx);

      expect(result).toMatchObject({
        results: [
          {
            type: ToolResultType.error,
            data: { message: expect.stringContaining('Send `params`, `settings` or both.') },
          },
        ],
      });
      expect(ctx.attachments.update).not.toHaveBeenCalled();
    });

    it('fails once the rule has been converted to a custom rule', async () => {
      const ctx = createContext(customRule);
      const tool = getTool(thresholdRule, updateToolId);

      const result = await tool.handler({ params: { groupByFields: [] } }, ctx);

      expect(result).toMatchObject({
        results: [
          {
            type: ToolResultType.error,
            data: { message: expect.stringContaining('is no longer a threshold rule') },
          },
        ],
      });
      expect(ctx.attachments.update).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('conversion tool', () => {
    it('removes the builder and keeps the generated query', async () => {
      const ctx = createContext(thresholdRule);
      const tool = getTool(thresholdRule, convertToolId);

      const result = await tool.handler({}, ctx);

      expect(ctx.attachments.update).toHaveBeenCalledWith(
        'attachment-1',
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { name: 'High CPU' },
            query: thresholdRule.query,
          }),
        })
      );
      expect(result).toMatchObject({
        results: [
          {
            type: ToolResultType.other,
            data: { message: expect.stringContaining('`platform.alerting.draft_custom_rule`') },
          },
        ],
      });
    });
  });
});
