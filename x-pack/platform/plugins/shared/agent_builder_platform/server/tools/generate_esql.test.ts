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
import { resolveToolSchema } from './test_utils';

const generateEsqlMock = generateEsql as jest.MockedFunction<typeof generateEsql>;

const createHandlerContext = () => {
  const context = agentBuilderMocks.tools.createHandlerContext();
  context.attachments.getActive.mockReturnValue([]);
  return context;
};

const run = async ({
  includeFrozen,
  includeFrozenByDefault = false,
}: { includeFrozen?: boolean; includeFrozenByDefault?: boolean } = {}) => {
  const tool = generateEsqlTool();
  const schema = await resolveToolSchema(tool, includeFrozenByDefault);
  return tool.handler(
    schema.parse({ query: 'total sales', include_frozen: includeFrozen }),
    createHandlerContext()
  );
};

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
      await run({ includeFrozen: true });

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: true })
      );
    });

    it('includes frozen tier indices by default when the space setting is enabled', async () => {
      await run({ includeFrozenByDefault: true });

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: true })
      );
    });

    it('lets the agent override the default', async () => {
      await run({ includeFrozen: false, includeFrozenByDefault: true });

      expect(generateEsqlMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: false })
      );
    });
  });
});
