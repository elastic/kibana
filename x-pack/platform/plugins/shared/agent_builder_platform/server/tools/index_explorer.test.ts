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

const indexExplorerMock = indexExplorer as jest.MockedFunction<typeof indexExplorer>;

describe('indexExplorerTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    indexExplorerMock.mockResolvedValue({ resources: [] });
  });

  it('excludes frozen tier indices by default', async () => {
    await indexExplorerTool().handler(
      { query: 'security alerts' },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(indexExplorerMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: false })
    );
  });

  it('includes frozen tier indices when opted in', async () => {
    await indexExplorerTool().handler(
      { query: 'security alerts', include_frozen: true },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(indexExplorerMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeFrozen: true })
    );
  });
});
