/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerGetExplorationProgressRoute } from './get_exploration_progress';

describe('GET /internal/aesop/exploration/{executionId}/progress', () => {
  it('registers the route with correct path and version', () => {
    const mockRouter = {
      versioned: {
        get: jest.fn().mockReturnThis(),
        addVersion: jest.fn(),
      },
    } as any;

    registerGetExplorationProgressRoute(mockRouter);

    expect(mockRouter.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/exploration/{executionId}/progress',
        access: 'internal',
      })
    );
  });

  it('validates executionId parameter', () => {
    const mockRouter = {
      versioned: {
        get: jest.fn().mockReturnThis(),
        addVersion: jest.fn(),
      },
    } as any;

    registerGetExplorationProgressRoute(mockRouter);

    const versionConfig = mockRouter.versioned.addVersion.mock.calls[0][0];
    expect(versionConfig.version).toBe('1');
    expect(versionConfig.validate.request.params).toBeDefined();
  });
});
