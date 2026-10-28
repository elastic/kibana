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
import { getClassicRuleTool } from './get_classic_rule';

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

describe('getClassicRuleTool', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let get: jest.Mock;
  let getClassicRulesClient: jest.Mock;
  let isMigratable: jest.Mock;

  const createTool = () => getClassicRuleTool({ logger, getClassicRulesClient, isMigratable });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    get = jest.fn().mockResolvedValue(classicRule);
    getClassicRulesClient = jest.fn().mockResolvedValue({ get });
    isMigratable = jest.fn().mockReturnValue(true);
  });

  it('uses the get_classic_rule tool id', () => {
    expect(createTool().id).toBe(ALERTING_TOOL_IDS.getClassicRule);
  });

  it('bounds the id input', () => {
    const { schema } = createTool();
    expect(schema.safeParse({ id: '' }).success).toBe(false);
    expect(schema.safeParse({ id: 'a'.repeat(1025) }).success).toBe(false);
    expect(schema.safeParse({ id: 'classic-1' }).success).toBe(true);
  });

  it('reads the rule with the classic rules client scoped to the tool request', async () => {
    const context = agentBuilderMocks.tools.createHandlerContext();

    const result = await createTool().handler({ id: 'classic-1' }, context);

    expect(getClassicRulesClient).toHaveBeenCalledWith(context.request);
    expect(get).toHaveBeenCalledWith({ id: 'classic-1' });
    expect(isMigratable).toHaveBeenCalledWith('.es-query');
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: {
            id: 'classic-1',
            name: 'High error count',
            ruleTypeId: '.es-query',
            consumer: 'stackAlerts',
            enabled: true,
            tags: ['prod'],
            schedule: { interval: '1m' },
            params: { esqlQuery: { esql: 'FROM logs-*' } },
            actions: [],
            alertDelay: { active: 2 },
            artifacts: undefined,
            migratable: true,
          },
        },
      ],
    });
  });

  it('returns an unauthorized error when the classic privilege check fails', async () => {
    get.mockRejectedValue(
      Boom.forbidden('Unauthorized by "stackAlerts" to get ".es-query" rule')
    );

    const result = await createTool().handler(
      { id: 'classic-1' },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Unauthorized to read classic rule "classic-1": Unauthorized by "stackAlerts" to get ".es-query" rule',
          },
        },
      ],
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns a not found error when the rule does not exist', async () => {
    get.mockRejectedValue(Boom.notFound('Saved object [alert/classic-1] not found'));

    const result = await createTool().handler(
      { id: 'classic-1' },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Classic rule "classic-1" was not found in the current space.' },
        },
      ],
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and returns an error for unexpected failures', async () => {
    get.mockRejectedValue(new Error('boom'));

    const result = await createTool().handler(
      { id: 'classic-1' },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Failed to fetch classic rule "classic-1": boom' },
        },
      ],
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to fetch classic rule: boom',
      expect.objectContaining({
        labels: expect.objectContaining({
          rule_id: 'classic-1',
          code: 'AGENT_BUILDER_GET_CLASSIC_RULE_FAILED',
        }),
      })
    );
  });
});
