/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from '@kbn/zod/v4';
import { loggerMock } from '@kbn/logging-mocks';
import { ZodJsonSchemaValidator } from './json_schema_validator';

const createServerWithOutputSchema = async () => {
  const server = new McpServer({ name: 'test-server', version: '1.0.0' });
  server.registerTool(
    'get_weather',
    {
      description: 'Get weather',
      outputSchema: { temp: z.number() },
    },
    () => ({ content: [{ type: 'text' as const, text: 'sunny' }] })
  );
  return server;
};

describe('ZodJsonSchemaValidator integration', () => {
  it('the default SDK validator fails under disallow-code-generation-from-strings', async () => {
    const server = await createServerWithOutputSchema();
    const client = new Client({ name: 'test-client', version: '1.0.0' });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    await expect(client.listTools()).rejects.toThrow(
      new EvalError('Code generation from strings disallowed for this context')
    );

    await client.close();
    await server.close();
  });

  it('succeeds with ZodJsonSchemaValidator under the same restriction', async () => {
    const logger = loggerMock.create();
    const validator = new ZodJsonSchemaValidator(logger);
    const spy = jest.spyOn(validator, 'getValidator');

    const server = await createServerWithOutputSchema();
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { jsonSchemaValidator: validator }
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('get_weather');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'object' }));

    await client.close();
    await server.close();
  });
});
