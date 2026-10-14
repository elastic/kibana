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

const executeEsqlMock = executeEsql as jest.MockedFunction<typeof executeEsql>;

const createHandlerContext = () => {
  const context = agentBuilderMocks.tools.createHandlerContext();
  context.attachments.getActive.mockReturnValue([]);
  return context;
};

describe('executeEsqlTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    executeEsqlMock.mockResolvedValue({
      columns: [{ name: 'c', type: 'long' }],
      values: [[42]],
    });
  });

  describe('include_frozen', () => {
    it('excludes frozen tier indices by default', async () => {
      await executeEsqlTool().handler({ query: 'FROM logs', limit: 100 }, createHandlerContext());

      expect(executeEsqlMock.mock.calls[0][0]).toMatchObject({ includeFrozen: false });
    });

    it('includes frozen tier indices when opted in', async () => {
      await executeEsqlTool().handler(
        { query: 'FROM logs', limit: 100, include_frozen: true },
        createHandlerContext()
      );

      expect(executeEsqlMock.mock.calls[0][0]).toMatchObject({ includeFrozen: true });
    });

    it('describes how to opt in to the frozen tier', () => {
      expect(executeEsqlTool().description).toContain('include_frozen');
    });
  });
});
