/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  CallToolRequestSchema,
  SUB_ACTION,
  TestConnectorRequestSchema,
} from '@kbn/connector-schemas/mcp';
import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { mcpConnectorSpec } from '@kbn/connector-specs/server';
import { z } from '@kbn/zod';
import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';

describe('mcp spec params compatibility', () => {
  const connectorType = createConnectorTypeFromSpec(mcpConnectorSpec, actionsMock.createSetup());
  const parse = (params: Record<string, unknown>) =>
    connectorType.validate.params!.schema.parse(params);
  const logger = loggingSystemMock.createLogger();

  const legacyValidationMessage = (schema: z.ZodType, value: unknown): string => {
    try {
      schema.parse(value);
    } catch (err) {
      const detail = err instanceof z.ZodError ? z.prettifyError(err) : String(err);
      return `Request validation failed (${detail})`;
    }
    throw new Error('expected schema parse to fail');
  };

  const validationError = async (params: Record<string, unknown>) => {
    const specError = await connectorType.executor!({
      actionId: 'connector-1',
      params,
      config: { serverUrl: 'https://example.com/mcp', hasAuth: false },
      secrets: {},
      logger,
      connectorVersion: 'WzEsMV0=',
      services: {} as never,
      configurationUtilities: actionsConfigMock.create(),
    } as never).catch((err) => err);

    return specError;
  };

  it('accepts the same top-level payloads as the legacy params schema', () => {
    expect(parse({ subAction: 'listTools' })).toEqual({
      subAction: 'listTools',
      subActionParams: {},
    });
    expect(parse({ subAction: 'listTools', subActionParams: { forceRefresh: true } })).toEqual({
      subAction: 'listTools',
      subActionParams: { forceRefresh: true },
    });
    expect(
      parse({
        subAction: 'callTool',
        subActionParams: { name: 'echo', arguments: { q: 1 } },
        fetchOptions: { max_content_length: 1024 },
      })
    ).toEqual({
      subAction: 'callTool',
      subActionParams: { name: 'echo', arguments: { q: 1 } },
    });
    expect(parse({ subAction: 'test' })).toEqual({ subAction: 'test', subActionParams: {} });
    expect(parse({ subAction: 'test', subActionParams: {} })).toEqual({
      subAction: 'test',
      subActionParams: {},
    });
    expect(parse({ subAction: 'test', subActionParams: { x: 1 } })).toEqual({
      subAction: 'test',
      subActionParams: { x: 1 },
    });
    expect(parse({ subAction: TEST_CONNECTOR_SUB_ACTION })).toEqual({
      subAction: TEST_CONNECTOR_SUB_ACTION,
      subActionParams: {},
    });
  });

  it('rejects invalid sub-action params with the legacy validation message', async () => {
    const invalid = await validationError({
      subAction: 'test',
      subActionParams: { x: 1 },
    });
    expect(invalid).toBeInstanceOf(Error);
    expect(invalid.message).toBe(legacyValidationMessage(TestConnectorRequestSchema, { x: 1 }));
    expect(getErrorSource(invalid)).toBe(TaskErrorSource.USER);

    const missingName = await validationError({
      subAction: 'callTool',
      subActionParams: {},
    });
    expect(missingName.message).toBe(legacyValidationMessage(CallToolRequestSchema, {}));
    expect(missingName.message).toContain('Request validation failed');
  });

  it('rejects an unknown sub-action with the legacy registration message', async () => {
    const unknown = await validationError({ subAction: 'unknown', subActionParams: {} });

    expect(unknown.message).toBe(
      'Sub action "unknown" is not registered. Connector id: connector-1. Connector name: MCP. Connector type: .mcp'
    );
    expect(Object.values(SUB_ACTION).sort()).toEqual(['callTool', 'listTools', 'test']);
  });
});
