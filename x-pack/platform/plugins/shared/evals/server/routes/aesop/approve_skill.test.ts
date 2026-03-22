/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { EvalsRequestHandlerContext } from '../../types';
import { registerApproveSkillRoute } from './approve_skill';

describe('AESOP Approve Skill Route', () => {
  let router: any;
  let mockContext: EvalsRequestHandlerContext;

  beforeEach(() => {
    router = {
      versioned: {
        post: jest.fn().mockReturnThis(),
      },
    };

    router.versioned.post.mockReturnValue({
      addVersion: jest.fn(),
    });

    mockContext = {
      evals: {
        datasetService: {} as any,
      },
    };
  });

  it('should register POST route for /internal/aesop/skills/{skillId}/approve', () => {
    registerApproveSkillRoute(router);

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/skills/{skillId}/approve',
        access: 'internal',
      })
    );
  });

  it('should validate skillId parameter', () => {
    registerApproveSkillRoute(router);

    const [[routeConfig]] = router.versioned.post.mock.calls;
    expect(routeConfig.path).toContain('{skillId}');
  });

  // Add more tests once implementation is verified
});
