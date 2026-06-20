/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildVisualizationConfig } from '@kbn/agent-builder-tools-base';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createPanelResolver } from './panel_resolver';

jest.mock('@kbn/agent-builder-tools-base', () => ({
  buildVisualizationConfig: jest.fn(),
}));

const mockedBuildVisualizationConfig = jest.mocked(buildVisualizationConfig);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('createPanelResolver (dispatcher)', () => {
  const deps = {
    logger: createMockLogger(),
    modelProvider: {} as ModelProvider,
    events: {} as ToolEventEmitter,
    esClient: {} as IScopedClusterClient,
  };

  beforeEach(() => {
    mockedBuildVisualizationConfig.mockReset();
  });

  it('routes vis requests to the vis resolver', async () => {
    mockedBuildVisualizationConfig.mockResolvedValue({
      validatedConfig: { type: 'metric' },
    } as Awaited<ReturnType<typeof buildVisualizationConfig>>);

    const resolvePanelContent = createPanelResolver(deps);

    const result = await resolvePanelContent({
      type: 'vis',
      operationType: 'add_panels',
      identifier: 'show total requests',
      nlQuery: 'show total requests',
    });

    expect(result).toEqual({
      type: 'success',
      panelContent: { type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } },
    });
    expect(mockedBuildVisualizationConfig).toHaveBeenCalledTimes(1);
  });

  it('returns a failure for an unsupported panel type without resolving', async () => {
    const resolvePanelContent = createPanelResolver(deps);

    const result = await resolvePanelContent({
      type: 'markdown',
      operationType: 'add_panels',
      identifier: 'note-1',
    } as unknown as Parameters<typeof resolvePanelContent>[0]);

    expect(result).toEqual({
      type: 'failure',
      failure: {
        type: 'add_panels',
        identifier: 'note-1',
        error: 'Inline resolution is not supported for panel type "markdown".',
      },
    });
    expect(mockedBuildVisualizationConfig).not.toHaveBeenCalled();
  });
});
