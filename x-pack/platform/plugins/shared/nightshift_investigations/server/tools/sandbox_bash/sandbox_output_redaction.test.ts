/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { REDACTED_PLACEHOLDER } from './output_redactor';
import {
  createSandboxOutputRedactorProvider,
  withSandboxOutputRedaction,
} from './sandbox_output_redaction';

const STORED_SECRET = 'stored-sandbox-secret';
const CONNECTOR_SECRET = 'connector-api-key-123';

const schema = z.object({});

const setup = ({
  getRedactionValues = jest.fn().mockResolvedValue([STORED_SECRET]),
  handlerReturn = {
    results: [
      {
        type: ToolResultType.other,
        data: { stdout: `a ${STORED_SECRET}`, nested: { stderr: `b ${CONNECTOR_SECRET}` } },
      },
    ],
  },
}: {
  getRedactionValues?: jest.Mock;
  handlerReturn?: unknown;
} = {}) => {
  const handler = jest.fn().mockResolvedValue(handlerReturn);
  const tool = { id: 'sandbox_tool', schema, handler } as unknown as BuiltinToolDefinition<
    typeof schema
  >;
  const actions = {
    inMemoryConnectors: [{ id: 'c1', secrets: { apiKey: CONNECTOR_SECRET } }],
  } as unknown as ActionsPluginStart;
  const logger = loggingSystemMock.createLogger();
  const wrapped = withSandboxOutputRedaction(tool, {
    getOutputRedactor: createSandboxOutputRedactorProvider({
      getDeps: () => ({ actions, sandboxSecretsClient: { getRedactionValues } }),
    }),
    logger,
  });
  const request = httpServerMock.createKibanaRequest();
  const run = () =>
    (wrapped.handler as unknown as (p: unknown, c: unknown) => Promise<unknown>)({}, { request });

  return { run, handler, getRedactionValues, logger, request };
};

describe('withSandboxOutputRedaction', () => {
  it('redacts stored sandbox secrets and connector secrets anywhere in the results', async () => {
    const { run, getRedactionValues, request } = setup();

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: {
            stdout: `a ${REDACTED_PLACEHOLDER}`,
            nested: { stderr: `b ${REDACTED_PLACEHOLDER}` },
          },
        },
      ],
    });
    expect(getRedactionValues).toHaveBeenCalledWith(request);
  });

  it('does not run the tool when stored secrets cannot be loaded', async () => {
    const { run, handler, logger } = setup({
      getRedactionValues: jest.fn().mockRejectedValue(new Error('Unable to decrypt')),
    });

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: expect.stringContaining('Sandbox tools are unavailable') },
        },
      ],
    });
    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Unable to decrypt'));
  });

  it('passes non-standard returns through unchanged', async () => {
    const handlerReturn = { prompt: { type: 'confirmation', message: 'confirm?' } };
    const { run } = setup({ handlerReturn });

    await expect(run()).resolves.toBe(handlerReturn);
  });
});
