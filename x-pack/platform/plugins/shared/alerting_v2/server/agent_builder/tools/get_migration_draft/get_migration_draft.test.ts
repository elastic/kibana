/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import { getMigrationDraftTool } from './get_migration_draft';

const classicRule = {
  id: 'classic-1',
  name: 'High error count',
  alertTypeId: '.es-query',
  consumer: 'stackAlerts',
  tags: ['prod'],
  schedule: { interval: '1m' },
  params: { esqlQuery: { esql: 'FROM logs-*' } },
  alertDelay: { active: 3 },
};

describe('getMigrationDraftTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let get: jest.Mock;
  let getClassicRulesClient: jest.Mock;
  let toV2Draft: jest.Mock;
  let getClassicRuleTypeMigration: jest.Mock;
  let ctx: ToolHandlerContextMock;

  const createTool = () =>
    getMigrationDraftTool({
      logger: loggerService,
      getClassicRulesClient,
      getClassicRuleTypeMigration,
    });

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    get = jest.fn().mockResolvedValue(classicRule);
    getClassicRulesClient = jest.fn().mockResolvedValue({ get });
    toV2Draft = jest.fn().mockReturnValue({
      query: { base: 'FROM logs-*' },
      time_field: '@timestamp',
      lookback: '5m',
    });
    getClassicRuleTypeMigration = jest.fn().mockReturnValue({ toV2Draft });
    ctx = agentBuilderMocks.tools.createHandlerContext();
    ctx.attachments.getActive.mockReturnValue([]);
    ctx.attachments.add.mockResolvedValue({
      id: 'attachment-1',
      type: RULE_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [],
    });
  });

  it('is a builtin tool with a bounded id input', () => {
    const tool = createTool();

    expect(tool.id).toBe(ALERTING_TOOL_IDS.getMigrationDraft);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.schema.safeParse({ id: 'classic-1' }).success).toBe(true);
    expect(tool.schema.safeParse({ id: '' }).success).toBe(false);
    expect(tool.schema.safeParse({ id: 'a'.repeat(1025) }).success).toBe(false);
  });

  it('adds the converted rule as a draft attachment without saving a rule', async () => {
    const result = await createTool().handler({ id: 'classic-1' }, ctx);

    expect(getClassicRulesClient).toHaveBeenCalledWith(ctx.request);
    expect(get).toHaveBeenCalledWith({ id: 'classic-1' });
    expect(getClassicRuleTypeMigration).toHaveBeenCalledWith('.es-query');
    expect(toV2Draft).toHaveBeenCalledWith(classicRule.params);
    expect(ctx.attachments.add).toHaveBeenCalledTimes(1);
    expect(ctx.attachments.add).toHaveBeenCalledWith(
      {
        id: expect.any(String),
        type: RULE_ATTACHMENT_TYPE,
        description: 'Rule: High error count',
        data: expect.objectContaining({
          id: expect.any(String),
          kind: 'alert',
          metadata: { name: 'High error count', tags: ['prod'] },
          schedule: { every: '1m', lookback: '5m' },
          time_field: '@timestamp',
          query: { base: 'FROM logs-*' },
          recovery: { strategy: 'no_breach' },
          no_data: { strategy: 'ignore' },
          state_transition: { pending: { count: 2 }, recovering: { count: 0 } },
        }),
      },
      undefined
    );
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          tool_result_id: expect.any(String),
          data: {
            version: 1,
            ruleAttachment: {
              id: 'attachment-1',
              ruleId: expect.any(String),
              name: 'High error count',
              kind: 'alert',
              schedule: { every: '1m', lookback: '5m' },
              query: { base: 'FROM logs-*' },
              time_field: '@timestamp',
            },
            sourceRuleId: 'classic-1',
            ruleTypeId: '.es-query',
          },
        },
      ],
    });
  });

  it('returns a 400 error when the rule type has no migration', async () => {
    getClassicRuleTypeMigration.mockReturnValue(undefined);

    const result = await createTool().handler({ id: 'classic-1' }, ctx);

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Classic rule "classic-1" has rule type ".es-query", which has no migration to universal alerting.',
            metadata: { status_code: 400 },
          },
        },
      ],
    });
    expect(ctx.attachments.add).not.toHaveBeenCalled();
  });

  it('returns a 422 error without a warning when the migration rejects the rule', async () => {
    toV2Draft.mockImplementation(() => {
      throw new Error('Only ES|QL rules can be migrated.');
    });

    const result = await createTool().handler({ id: 'classic-1' }, ctx);

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Classic rule "classic-1" cannot be migrated: Only ES|QL rules can be migrated.',
            metadata: { status_code: 422 },
          },
        },
      ],
    });
    expect(ctx.attachments.add).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('returns a 403 error when the user cannot read the rule', async () => {
    get.mockRejectedValue(Boom.forbidden('Unauthorized by "stackAlerts" to get ".es-query" rule'));

    const result = await createTool().handler({ id: 'classic-1' }, ctx);

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Unauthorized to read classic rule "classic-1": Unauthorized by "stackAlerts" to get ".es-query" rule',
            metadata: { status_code: 403 },
          },
        },
      ],
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('returns a 404 error when the rule does not exist in the space', async () => {
    get.mockRejectedValue(Boom.notFound('Saved object [alert/classic-1] not found'));

    const result = await createTool().handler({ id: 'classic-1' }, ctx);

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: 'Classic rule "classic-1" was not found in the current space.',
            metadata: { status_code: 404 },
          },
        },
      ],
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('logs and returns a 500 error for unexpected failures', async () => {
    get.mockRejectedValue(new Error('boom'));

    const result = await createTool().handler({ id: 'classic-1' }, ctx);

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: 'Failed to build a migration draft for classic rule "classic-1": boom',
            metadata: { status_code: 500 },
          },
        },
      ],
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to build migration draft',
      expect.objectContaining({
        labels: {
          rule_id: 'classic-1',
          space_id: 'default',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_GET_MIGRATION_DRAFT_FAILED,
        },
        error: expect.objectContaining({ message: 'boom', type: 'Error' }),
      })
    );
  });
});
