/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import type { RuleMigrationDefinition } from '../../../lib/rule_migration/types';
import { getMigrationDraftTool } from './get_migration_draft';

jest.mock('uuid', () => ({ v4: () => 'draft-rule-id' }));

const classicRule = {
  id: 'classic-1',
  name: 'High error count',
  alertTypeId: '.es-query',
  consumer: 'stackAlerts',
  enabled: true,
  tags: ['prod'],
  schedule: { interval: '1m' },
  params: { esqlQuery: { esql: 'FROM logs-*' } },
  actions: [],
  alertDelay: { active: 2 },
  artifacts: undefined,
};

const esQueryMigration: RuleMigrationDefinition = {
  ruleTypeId: '.es-query',
  convertParams: () => ({ query: { base: 'FROM logs-*' } }),
};

describe('getMigrationDraftTool', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let get: jest.Mock;
  let getClassicRulesClient: jest.Mock;
  let getMigrationDefinition: jest.Mock;
  let context: ReturnType<typeof agentBuilderMocks.tools.createHandlerContext>;

  const createTool = () =>
    getMigrationDraftTool({ logger, getClassicRulesClient, getMigrationDefinition });

  const runTool = () => createTool().handler({ id: 'classic-1' }, context);

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    get = jest.fn().mockResolvedValue(classicRule);
    getClassicRulesClient = jest.fn().mockResolvedValue({ get });
    getMigrationDefinition = jest.fn().mockReturnValue(esQueryMigration);
    context = agentBuilderMocks.tools.createHandlerContext();
    context.attachments.add.mockResolvedValue({
      id: 'attachment-1',
      type: RULE_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [],
    });
  });

  it('uses the get_migration_draft tool id', () => {
    expect(createTool().id).toBe(ALERTING_TOOL_IDS.getMigrationDraft);
  });

  it('bounds the id input', () => {
    const { schema } = createTool();
    expect(schema.safeParse({ id: '' }).success).toBe(false);
    expect(schema.safeParse({ id: 'a'.repeat(1025) }).success).toBe(false);
    expect(schema.safeParse({ id: 'classic-1' }).success).toBe(true);
  });

  it('reads the rule with the classic rules client scoped to the tool request', async () => {
    await runTool();

    expect(getClassicRulesClient).toHaveBeenCalledWith(context.request);
    expect(get).toHaveBeenCalledWith({ id: 'classic-1' });
    expect(getMigrationDefinition).toHaveBeenCalledWith('.es-query');
  });

  it('adds the converted rule to the conversation as a rule attachment', async () => {
    await runTool();

    expect(context.attachments.add).toHaveBeenCalledTimes(1);
    expect(context.attachments.add).toHaveBeenCalledWith({
      id: 'draft-rule-id',
      type: RULE_ATTACHMENT_TYPE,
      description: 'Rule: High error count',
      data: expect.objectContaining({
        id: 'draft-rule-id',
        kind: 'alert',
        metadata: { name: 'High error count', tags: ['prod'] },
        query: { base: 'FROM logs-*' },
        schedule: { every: '1m' },
        state_transition: { pending: { count: 1 }, recovering: { count: 0 } },
      }),
    });
  });

  it('returns the rule attachment, action policies, and skipped actions', async () => {
    expect(await runTool()).toEqual({
      results: [
        {
          type: ToolResultType.other,
          tool_result_id: expect.any(String),
          data: {
            version: 1,
            ruleAttachment: {
              id: 'attachment-1',
              ruleId: 'draft-rule-id',
              name: 'High error count',
              kind: 'alert',
              schedule: { every: '1m' },
              query: { base: 'FROM logs-*' },
              time_field: '@timestamp',
            },
            sourceRuleId: 'classic-1',
            ruleTypeId: '.es-query',
            actionPolicies: [],
            skippedActions: [],
          },
        },
      ],
    });
  });

  it('returns a 403 error when the classic privilege check fails', async () => {
    get.mockRejectedValue(
      Boom.forbidden('Unauthorized by "stackAlerts" to get ".es-query" rule')
    );

    expect(await runTool()).toEqual({
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
    expect(getMigrationDefinition).not.toHaveBeenCalled();
    expect(context.attachments.add).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns an error when the rule type has no registered migration', async () => {
    getMigrationDefinition.mockReturnValue(undefined);

    expect(await runTool()).toEqual({
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
    expect(context.attachments.add).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns a 404 error when the rule does not exist', async () => {
    get.mockRejectedValue(Boom.notFound('Saved object [alert/classic-1] not found'));

    expect(await runTool()).toEqual({
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
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and returns an error for unexpected failures', async () => {
    getMigrationDefinition.mockReturnValue({
      ...esQueryMigration,
      convertParams: () => {
        throw new Error('unsupported query');
      },
    });

    expect(await runTool()).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Failed to build a migration draft for classic rule "classic-1": unsupported query',
            metadata: { status_code: 500 },
          },
        },
      ],
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to build migration draft: unsupported query',
      expect.objectContaining({
        labels: expect.objectContaining({
          rule_id: 'classic-1',
          code: 'AGENT_BUILDER_GET_MIGRATION_DRAFT_FAILED',
        }),
      })
    );
  });
});
