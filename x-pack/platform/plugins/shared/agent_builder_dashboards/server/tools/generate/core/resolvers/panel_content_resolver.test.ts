/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { PanelContentAttempt } from '../resolve_panel';
import type { PanelResolutionRequest } from '../operations/panels';
import { createPanelContentResolver } from './panel_content_resolver';
import { createVisPanelResolver } from './vis_panel_resolver';

jest.mock('./vis_panel_resolver', () => ({
  createVisPanelResolver: jest.fn(),
}));

const mockedCreateVisPanelResolver = jest.mocked(createVisPanelResolver);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('createPanelContentResolver', () => {
  const deps = {
    logger: createMockLogger(),
    modelProvider: {} as ModelProvider,
    events: {} as ToolEventEmitter,
    esClient: {} as IScopedClusterClient,
  };

  beforeEach(() => {
    mockedCreateVisPanelResolver.mockReset();
  });

  it('routes vis requests to the vis resolver created with the shared deps', async () => {
    const visAttempt: PanelContentAttempt = {
      type: 'success',
      panelContent: { type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } },
    };
    const resolveVisPanel = jest.fn().mockResolvedValue(visAttempt);
    mockedCreateVisPanelResolver.mockReturnValue(resolveVisPanel);

    const resolvePanelContent = createPanelContentResolver(deps);

    const request: PanelResolutionRequest = {
      type: 'vis',
      operationType: 'add_panels',
      identifier: 'show total requests',
      nlQuery: 'show total requests',
    };

    await expect(resolvePanelContent(request)).resolves.toBe(visAttempt);
    expect(mockedCreateVisPanelResolver).toHaveBeenCalledWith(deps);
    expect(resolveVisPanel).toHaveBeenCalledWith(request);
  });

  it('throws for a request type without a registered resolver', async () => {
    const resolveVisPanel = jest.fn();
    mockedCreateVisPanelResolver.mockReturnValue(resolveVisPanel);

    const resolvePanelContent = createPanelContentResolver(deps);

    const unknownRequest = {
      type: 'unregistered',
      operationType: 'add_panels',
      identifier: 'some request',
    } as unknown as PanelResolutionRequest;

    await expect(resolvePanelContent(unknownRequest)).rejects.toThrow(
      'No panel content resolver is registered for panel type "unregistered".'
    );
    expect(resolveVisPanel).not.toHaveBeenCalled();
  });
});
