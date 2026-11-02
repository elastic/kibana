/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  ...jest.requireActual('@kbn/agent-builder-genai-utils'),
  indexExplorer: jest.fn(),
}));

import { indexExplorer } from '@kbn/agent-builder-genai-utils';
import { indexExplorerTool } from './index_explorer';
import { resolveToolSchema } from './test_utils';

const indexExplorerMock = indexExplorer as jest.MockedFunction<typeof indexExplorer>;

const run = async ({
  includeFrozen,
  includeFrozenByDefault = false,
}: { includeFrozen?: boolean; includeFrozenByDefault?: boolean } = {}) => {
  const tool = indexExplorerTool();
  const schema = await resolveToolSchema(tool, includeFrozenByDefault);
  await tool.handler(
    schema.parse({ query: 'security alerts', include_frozen: includeFrozen }),
    agentBuilderMocks.tools.createHandlerContext()
  );
};

describe('indexExplorerTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    indexExplorerMock.mockResolvedValue({ resources: [] });
  });

  it('excludes frozen tier indices by default', async () => {
    await run();

    expect(indexExplorerMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: false })
    );
  });

  it('includes frozen tier indices when opted in', async () => {
    await run({ includeFrozen: true });

    expect(indexExplorerMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: true })
    );
  });

  it('includes frozen tier indices by default when the space setting is enabled', async () => {
    await run({ includeFrozenByDefault: true });

    expect(indexExplorerMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: true })
    );
  });

  it('lets the agent override the default', async () => {
    await run({ includeFrozen: false, includeFrozenByDefault: true });

    expect(indexExplorerMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: false })
    );
  });
});
