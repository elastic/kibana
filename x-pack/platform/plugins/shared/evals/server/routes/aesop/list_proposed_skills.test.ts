/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsRequestHandlerContext } from '../../types';
import { registerListProposedSkillsRoute } from './list_proposed_skills';

describe('AESOP List Proposed Skills Route', () => {
  let router: any;
  let mockContext: EvalsRequestHandlerContext;

  beforeEach(() => {
    router = {
      versioned: {
        get: jest.fn().mockReturnThis(),
      },
    };

    router.versioned.get.mockReturnValue({
      addVersion: jest.fn(),
    });

    mockContext = {
      evals: {
        datasetService: {} as any,
      },
    };
  });

  it('should register GET route for /internal/aesop/skills/proposed', () => {
    registerListProposedSkillsRoute(router);

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/skills/proposed',
        access: 'internal',
      })
    );
  });

  describe('filtering', () => {
    it('should support status filter query parameter', () => {
      // pending, validated, approved, rejected
      // TODO: Add test with mock ES client
    });

    it('should support skill_type filter query parameter', () => {
      // investigation, triage, enrichment, correlation
      // TODO: Add test
    });

    it('should support pagination (from, size)', () => {
      // TODO: Add test
    });
  });

  describe('response structure', () => {
    it('should return array of skills with metadata', () => {
      // Each skill should have: id, name, description, status, created_at, eval_score, etc.
      // TODO: Add test
    });
  });
});
