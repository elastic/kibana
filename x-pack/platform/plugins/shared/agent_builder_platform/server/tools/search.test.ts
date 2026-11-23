/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { TopSnippetsConfig } from '@kbn/agent-builder-genai-utils/tools';

jest.mock('@kbn/agent-builder-genai-utils/tools', () => ({
  ...jest.requireActual('@kbn/agent-builder-genai-utils/tools'),
  runSearchTool: jest.fn(),
}));

import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import { searchTool } from './search';
import { resolveToolSchema } from './test_utils';

const runSearchToolMock = runSearchTool as jest.MockedFunction<typeof runSearchTool>;

const createTool = () =>
  searchTool({
    coreSetup: coreMock.createSetup(),
    topSnippetsDefaults: {} as TopSnippetsConfig,
  });

const createHandlerContext = () => {
  const context = agentBuilderMocks.tools.createHandlerContext();
  context.attachments.getActive.mockReturnValue([]);
  return context;
};

const run = async ({
  includeFrozen,
  includeFrozenByDefault = false,
}: { includeFrozen?: boolean; includeFrozenByDefault?: boolean } = {}) => {
  const tool = createTool();
  const schema = await resolveToolSchema(tool, includeFrozenByDefault);
  await tool.handler(
    schema.parse({ query: 'failed logins', include_frozen: includeFrozen }),
    createHandlerContext()
  );
};

describe('searchTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runSearchToolMock.mockResolvedValue([]);
  });

  it('excludes frozen tier indices by default', async () => {
    await run();

    expect(runSearchToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: false })
    );
  });

  it('includes frozen tier indices when opted in', async () => {
    await run({ includeFrozen: true });

    expect(runSearchToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: true })
    );
  });

  it('includes frozen tier indices by default when the space setting is enabled', async () => {
    await run({ includeFrozenByDefault: true });

    expect(runSearchToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: true })
    );
  });

  it('lets the agent override the default', async () => {
    await run({ includeFrozen: false, includeFrozenByDefault: true });

    expect(runSearchToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: false })
    );
  });
});
