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

describe('searchTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runSearchToolMock.mockResolvedValue([]);
  });

  it('excludes frozen tier indices by default', async () => {
    await createTool().handler({ query: 'failed logins' }, createHandlerContext());

    expect(runSearchToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: false })
    );
  });

  it('includes frozen tier indices when opted in', async () => {
    await createTool().handler(
      { query: 'failed logins', include_frozen: true },
      createHandlerContext()
    );

    expect(runSearchToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: true })
    );
  });
});
