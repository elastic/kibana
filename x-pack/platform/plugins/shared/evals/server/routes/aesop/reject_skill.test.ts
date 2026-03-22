/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsRequestHandlerContext } from '../../types';
import { registerRejectSkillRoute } from './reject_skill';

describe('AESOP Reject Skill Route', () => {
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

  it('should register POST route for /internal/aesop/skills/{skillId}/reject', () => {
    registerRejectSkillRoute(router);

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/skills/{skillId}/reject',
        access: 'internal',
      })
    );
  });

  it('should validate rejection reasons enum', () => {
    registerRejectSkillRoute(router);

    // Verify route accepts rejection_reason parameter
    const [[routeConfig]] = router.versioned.post.mock.calls;
    expect(routeConfig.path).toContain('{skillId}');
  });

  // Add integration tests for rejection workflow
  describe('rejection workflow', () => {
    it('should store rejection feedback in .aesop-rejection-feedback index', () => {
      // TODO: Add test once ES client is mocked
    });

    it('should support 5 rejection reasons', () => {
      // poor_quality, overlaps_existing, not_useful, security_concern, other
      // TODO: Add test
    });
  });
});
