/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerGetExplorationProgressRoute } from './get_exploration_progress';

describe('GET /internal/aesop/exploration/{executionId}/progress', () => {
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
  });

  it('registers the route with correct path and version', () => {
    const mockRouter = {
      versioned: {
        get: jest.fn().mockReturnValue({
          addVersion: jest.fn(),
        }),
      },
    } as any;

    registerGetExplorationProgressRoute({ router: mockRouter, logger: mockLogger });

    expect(mockRouter.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/exploration/{executionId}/progress',
        access: 'internal',
      })
    );
  });

  it('validates executionId parameter', () => {
    let capturedVersionConfig: any;
    const mockRouter = {
      versioned: {
        get: jest.fn().mockReturnValue({
          addVersion: jest.fn((config: any) => {
            capturedVersionConfig = config;
          }),
        }),
      },
    } as any;

    registerGetExplorationProgressRoute({ router: mockRouter, logger: mockLogger });

    expect(capturedVersionConfig.version).toBe('1');
    expect(capturedVersionConfig.validate.request.params).toBeDefined();
  });
});
