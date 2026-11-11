/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import type { ServerHandlerStepDefinition } from '@kbn/workflows-extensions/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ACTION_SOURCE_STEP_CONFIG_KEY } from '../../common/constants';
import { invokeStepHandler } from './invoke_step';

const buildToolContext = (overrides: Partial<ToolHandlerContext> = {}): ToolHandlerContext =>
  ({
    request: httpServerMock.createKibanaRequest(),
    logger: loggingSystemMock.createLogger(),
    ...overrides,
  } as ToolHandlerContext);

const buildStepDef = (
  handler: ServerHandlerStepDefinition['handler']
): ServerHandlerStepDefinition =>
  ({
    id: 'cases.create',
    handler,
  } as ServerHandlerStepDefinition);

describe('invokeStepHandler', () => {
  it('puts an agent actionSource on the step config', async () => {
    const handler = jest.fn().mockResolvedValue({ output: { case: { id: 'case-1' } } });

    await invokeStepHandler(
      buildStepDef(handler),
      { title: 'New case' },
      buildToolContext({
        runContext: {
          runId: 'run-1',
          stack: [
            {
              type: 'agent',
              agentId: 'elastic-ai-agent',
              agentName: 'Elastic AI Agent',
              conversationId: 'conv-1',
            },
          ],
        },
      })
    );

    expect(handler.mock.calls[0][0].config[ACTION_SOURCE_STEP_CONFIG_KEY]).toEqual({
      type: 'agent',
      id: 'elastic-ai-agent',
      name: 'Elastic AI Agent',
      run_id: 'conv-1',
    });
  });

  it('omits actionSource when the tool has no run context', async () => {
    const handler = jest.fn().mockResolvedValue({ output: {} });

    await invokeStepHandler(buildStepDef(handler), {}, buildToolContext());

    expect(handler.mock.calls[0][0].config[ACTION_SOURCE_STEP_CONFIG_KEY]).toBeUndefined();
  });
});
