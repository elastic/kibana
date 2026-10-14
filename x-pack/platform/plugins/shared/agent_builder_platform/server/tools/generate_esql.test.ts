/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  ...jest.requireActual('@kbn/agent-builder-genai-utils'),
  generateEsql: jest.fn(),
}));

import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { generateEsqlTool } from './generate_esql';

const generateEsqlMock = generateEsql as jest.MockedFunction<typeof generateEsql>;

const createHandlerContext = () => {
  const context = agentBuilderMocks.tools.createHandlerContext();
  context.attachments.getActive.mockReturnValue([]);
  return context;
};

const run = async (includeFrozen?: boolean) =>
  generateEsqlTool().handler(
    {
      query: 'total sales',
      execute_query: true,
      disable_named_params: false,
      include_frozen: includeFrozen,
    },
    createHandlerContext()
  );

describe('generateEsqlTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateEsqlMock.mockResolvedValue({ query: 'FROM sales', answer: 'ok' });
  });

  describe('include_frozen', () => {
    it('excludes frozen tier indices by default', async () => {
      await run();

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: false })
      );
    });

    it('includes frozen tier indices when opted in', async () => {
      await run(true);

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: true })
      );
    });
  });
});
