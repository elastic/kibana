/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { RULE_BUILDER_TYPES, THRESHOLD_BUILDER_TYPE } from '@kbn/alerting-v2-rule-builders';
import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import {
  createAttachmentRecord,
  mockAttachmentWrites,
} from '../rule_operations/rule_attachment.mock';
import { draftBuilderRuleTool } from './draft_builder_rule';
import { mockDateFields, mockEsqlColumns } from './es_client.mock';

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

const createContext = (): ToolHandlerContextMock => {
  const ctx = agentBuilderMocks.tools.createHandlerContext();
  mockAttachmentWrites(ctx);
  mockEsqlColumns(ctx.esClient, [{ name: 'avg_cpu', type: 'double' }]);
  mockDateFields(ctx.esClient, ['@timestamp']);
  return ctx;
};

describe('draftBuilderRuleTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let tool: ReturnType<typeof draftBuilderRuleTool>;

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    tool = draftBuilderRuleTool(builder, { logger: loggerService });
  });

  describe('definition', () => {
    it('is named after the builder', () => {
      expect(tool.id).toBe('platform.alerting.draft_threshold_rule');
    });

    it('describes the builder, its examples and the settings operations', () => {
      expect(tool.description).toContain(builder.whenToUse);
      for (const { params: exampleParams } of builder.examples) {
        expect(tool.description).toContain(JSON.stringify(exampleParams));
      }
      expect(tool.description).toContain('Use `set_metadata`');
      expect(tool.description).not.toContain('Use `set_query`');
    });

    it('takes params instead of ES|QL operations', () => {
      expect(
        tool.schema.safeParse({
          params,
          settings: [{ operation: 'set_query', query: { base: 'FROM metrics-*' } }],
        }).success
      ).toBe(false);
      expect(tool.schema.safeParse({ params }).success).toBe(true);
    });
  });

  describe('handler', () => {
    it('creates a builder rule attachment and returns its params', async () => {
      const ctx = createContext();

      const result = await tool.handler(
        { params, settings: [{ operation: 'set_metadata', name: 'High CPU' }] },
        ctx
      );

      expect(ctx.attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: expect.any(String),
            kind: 'alert',
            metadata: { name: 'High CPU', builder: { type: 'threshold' } },
            grouping: { fields: ['host.name'] },
          }),
        })
      );
      expect(result).toMatchObject({
        results: [
          {
            type: ToolResultType.other,
            data: {
              version: 1,
              ruleAttachment: { name: 'High CPU', builder: 'threshold' },
              params,
              queryColumns: [{ name: 'avg_cpu', type: 'double' }],
            },
          },
        ],
      });
    });

    it('redrafts an existing attachment, keeping its other settings', async () => {
      const ctx = createContext();
      ctx.attachments.getAttachmentRecord.mockReturnValue(
        createAttachmentRecord({
          data: {
            id: 'rule-1',
            kind: 'alert',
            metadata: { name: 'High CPU', builder: { type: 'threshold' } },
            schedule: { every: '1m' },
            query: { base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu)' },
          },
        })
      );

      await tool.handler({ ruleAttachmentId: 'attachment-1', params, settings: [] }, ctx);

      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(ctx.attachments.update).toHaveBeenCalledWith(
        'attachment-1',
        expect.objectContaining({
          data: expect.objectContaining({ id: 'rule-1', schedule: { every: '1m' } }),
        })
      );
    });

    it('returns invalid params as an error the agent can correct, logged at debug', async () => {
      const ctx = createContext();

      const result = await tool.handler(
        {
          params: {
            ...params,
            alertConditions: [{ metric: 'x', comparator: '>', threshold: [1] }],
          },
          settings: [{ operation: 'set_metadata', name: 'High CPU' }],
        },
        ctx
      );

      expect(result).toMatchObject({
        results: [
          {
            type: ToolResultType.error,
            data: { message: expect.stringContaining('Invalid Threshold params') },
          },
        ],
      });
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('logs unexpected failures at warn', async () => {
      const ctx = createContext();
      ctx.attachments.add.mockRejectedValue(new Error('store unavailable'));

      const result = await tool.handler(
        { params, settings: [{ operation: 'set_metadata', name: 'High CPU' }] },
        ctx
      );

      expect(result).toMatchObject({
        results: [{ type: ToolResultType.error, data: { message: expect.any(String) } }],
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
