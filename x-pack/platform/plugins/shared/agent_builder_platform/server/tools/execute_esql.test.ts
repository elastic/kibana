/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';

jest.mock('@kbn/agent-builder-genai-utils/tools/utils/esql', () => ({
  ...jest.requireActual('@kbn/agent-builder-genai-utils/tools/utils/esql'),
  executeEsql: jest.fn(),
}));

import { executeEsql } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { executeEsqlTool } from './execute_esql';
import { resolveToolSchema } from './test_utils';

const executeEsqlMock = executeEsql as jest.MockedFunction<typeof executeEsql>;

const createHandlerContext = () => {
  const context = agentBuilderMocks.tools.createHandlerContext();
  context.attachments.getActive.mockReturnValue([]);
  return context;
};

describe('executeEsqlTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    executeEsqlMock.mockResolvedValue({ columns: [], values: [] });
  });

  describe('include_frozen', () => {
    const getSchema = (includeFrozenByDefault: boolean) =>
      resolveToolSchema(executeEsqlTool(), includeFrozenByDefault);

    it('excludes frozen tier indices by default', async () => {
      const schema = await getSchema(false);

      await executeEsqlTool().handler(schema.parse({ query: 'FROM logs' }), createHandlerContext());

      expect(executeEsqlMock.mock.calls[0][0]).toMatchObject({ includeFrozen: false });
    });

    it('includes frozen tier indices by default when the space setting is enabled', async () => {
      const schema = await getSchema(true);

      await executeEsqlTool().handler(schema.parse({ query: 'FROM logs' }), createHandlerContext());

      expect(executeEsqlMock.mock.calls[0][0]).toMatchObject({ includeFrozen: true });
    });

    it('lets the agent override the default', async () => {
      const schema = await getSchema(true);

      await executeEsqlTool().handler(
        schema.parse({ query: 'FROM logs', include_frozen: false }),
        createHandlerContext()
      );

      expect(executeEsqlMock.mock.calls[0][0]).toMatchObject({ includeFrozen: false });
    });

    it('reuses the same schema instance for a given default', async () => {
      expect(await getSchema(true)).toBe(await getSchema(true));
      expect(await getSchema(false)).toBe(await getSchema(false));
      expect(await getSchema(true)).not.toBe(await getSchema(false));
    });

    it('describes how to opt in to the frozen tier', () => {
      expect(executeEsqlTool().description).toContain('include_frozen');
    });
  });
});
