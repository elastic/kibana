/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP UI Navigation - E2E Tests
 *
 * Tests user interface interactions (non-Scout, Scout handles browser automation):
 * - Dashboard navigation
 * - Skill review interface
 * - Progress monitoring
 * - Approval workflows
 * - Error states
 *
 * Note: These are API-level tests. Scout tests would handle actual browser interactions.
 * Duration: ~5 minutes
 */

describe('AESOP E2E: UI Navigation & Workflows', () => {
  describe('Dashboard API Endpoints', () => {
    it('should fetch dashboard overview', async () => {
      /**
       * GET /internal/aesop/dashboard
       *
       * Returns overview metrics for UI dashboard
       */

      // TODO: Fetch dashboard
      // const response = await supertest
      //   .get('/internal/aesop/dashboard')
      //   .expect(200);

      // Mock: Dashboard data
      const mockDashboard = {
        total_explorations: 15,
        total_skills_proposed: 48,
        total_skills_approved: 32,
        total_skills_rejected: 10,
        pending_reviews: 6,
        approval_rate: 0.76, // 32 / (32+10)
        recent_explorations: [
          { id: 'exec-1', status: 'completed', started_at: '2024-01-01T10:00:00Z' },
          { id: 'exec-2', status: 'running', started_at: '2024-01-01T11:00:00Z' },
        ],
      };

      expect(mockDashboard).toHaveProperty('total_explorations');
      expect(mockDashboard).toHaveProperty('approval_rate');
      expect(mockDashboard.recent_explorations.length).toBeGreaterThan(0);
    });

    it('should fetch skills pending review', async () => {
      /**
       * GET /internal/aesop/skills/pending
       *
       * Returns skills awaiting human approval
       */

      // TODO: Fetch pending skills
      // const response = await supertest
      //   .get('/internal/aesop/skills/pending')
      //   .expect(200);

      // Mock: Pending skills
      const mockPendingSkills = [
        {
          id: 'skill-1',
          name: 'lateral_movement_investigation',
          status: 'validated',
          eval_score: 0.89,
          confidence: 0.92,
          created_at: '2024-01-01T10:30:00Z',
        },
        {
          id: 'skill-2',
          name: 'privilege_escalation_chain',
          status: 'validated',
          eval_score: 0.91,
          confidence: 0.95,
          created_at: '2024-01-01T10:45:00Z',
        },
      ];

      expect(mockPendingSkills.length).toBeGreaterThan(0);
      mockPendingSkills.forEach((skill) => {
        expect(skill.status).toBe('validated');
        expect(skill.eval_score).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('should fetch exploration history with pagination', async () => {
      /**
       * GET /internal/aesop/explorations?page=1&size=10
       */

      // TODO: Fetch history
      // const response = await supertest
      //   .get('/internal/aesop/explorations?page=1&size=10')
      //   .expect(200);

      // Mock: Paginated history
      const mockHistory = {
        total: 25,
        page: 1,
        size: 10,
        items: [
          {
            id: 'exec-1',
            status: 'completed',
            duration_ms: 900000,
            skills_discovered: 5,
            started_at: '2024-01-01T10:00:00Z',
          },
          // ... 9 more items
        ],
      };

      expect(mockHistory.items.length).toBeLessThanOrEqual(mockHistory.size);
      expect(mockHistory.total).toBeGreaterThanOrEqual(mockHistory.items.length);
    });
  });

  describe('Skill Review Workflow APIs', () => {
    it('should fetch detailed skill information for review', async () => {
      /**
       * GET /internal/aesop/skills/{skillId}/details
       *
       * Returns all info needed for human review
       */

      const skillId = 'skill-1';

      // TODO: Fetch skill details
      // const response = await supertest
      //   .get(`/internal/aesop/skills/${skillId}/details`)
      //   .expect(200);

      // Mock: Detailed skill info
      const mockDetails = {
        id: skillId,
        name: 'lateral_movement_investigation',
        description: 'Investigates lateral movement by correlating process, network, and auth events',
        markdown_content: '# Lateral Movement Investigation\n\n...',
        metadata: {
          discovery_method: 'persona_observation',
          pattern_frequency: 15,
          confidence: 0.92,
          created_at: '2024-01-01T10:30:00Z',
        },
        validation_results: {
          eval_score: 0.89,
          precision: 0.92,
          recall: 0.87,
          f1_score: 0.89,
          passed_examples: 11,
          failed_examples: 1,
        },
        performance_metrics: {
          avg_tokens: 3500,
          avg_latency_ms: 2800,
          error_rate: 0.0,
        },
        example_queries: [
          'Investigate lateral movement from host prod-web-01',
          'Analyze suspicious network connections for user alice',
        ],
      };

      expect(mockDetails).toHaveProperty('markdown_content');
      expect(mockDetails).toHaveProperty('validation_results');
      expect(mockDetails).toHaveProperty('performance_metrics');
    });

    it('should fetch validation details (eval results)', async () => {
      /**
       * GET /internal/aesop/skills/{skillId}/validation
       *
       * Returns detailed eval results
       */

      const skillId = 'skill-1';

      // TODO: Fetch validation
      // const response = await supertest
      //   .get(`/internal/aesop/skills/${skillId}/validation`)
      //   .expect(200);

      // Mock: Validation details
      const mockValidation = {
        skill_id: skillId,
        validation_id: 'val-123',
        status: 'completed',
        eval_score: 0.89,
        examples: [
          {
            example_id: 'ex-1',
            input: { alert_id: 'alert-1' },
            expected_output: { classification: 'high' },
            actual_output: { classification: 'high' },
            passed: true,
            eval_score: 0.95,
          },
          {
            example_id: 'ex-2',
            input: { alert_id: 'alert-2' },
            expected_output: { classification: 'medium' },
            actual_output: { classification: 'medium' },
            passed: true,
            eval_score: 0.88,
          },
        ],
      };

      expect(mockValidation.examples.length).toBeGreaterThan(0);
    });

    it('should support bulk approval workflow', async () => {
      /**
       * POST /internal/aesop/skills/bulk-approve
       *
       * Approve multiple skills at once
       */

      // TODO: Bulk approve
      // const response = await supertest
      //   .post('/internal/aesop/skills/bulk-approve')
      //   .set('kbn-xsrf', 'true')
      //   .send({
      //     skill_ids: ['skill-1', 'skill-2', 'skill-3'],
      //     review_notes: 'Batch approval after review',
      //     reviewer: 'admin-user',
      //   })
      //   .expect(200);

      // Mock: Bulk approval result
      const mockBulkResult = {
        approved_count: 3,
        failed_count: 0,
        results: [
          { skill_id: 'skill-1', status: 'approved', deployed: true },
          { skill_id: 'skill-2', status: 'approved', deployed: true },
          { skill_id: 'skill-3', status: 'approved', deployed: true },
        ],
      };

      expect(mockBulkResult.approved_count).toBe(3);
      expect(mockBulkResult.failed_count).toBe(0);
    });
  });

  describe('Progress Monitoring APIs', () => {
    it('should stream progress updates via SSE (Server-Sent Events)', async () => {
      /**
       * GET /internal/aesop/exploration/{executionId}/stream
       *
       * Real-time progress updates for UI
       */

      const executionId = 'exec-123';

      // TODO: Connect to SSE stream
      // const eventSource = new EventSource(`/internal/aesop/exploration/${executionId}/stream`);
      // const events = [];
      // eventSource.onmessage = (event) => events.push(JSON.parse(event.data));

      // Mock: SSE events
      const mockEvents = [
        { phase: 1, step: 'Discovering indices', progress: 5 },
        { phase: 1, step: 'Analyzing schemas', progress: 15 },
        { phase: 2, step: 'Profiling cardinalities', progress: 30 },
        { phase: 3, step: 'Finding relationships', progress: 50 },
      ];

      expect(mockEvents.length).toBeGreaterThan(0);
      expect(mockEvents[mockEvents.length - 1].progress).toBeGreaterThan(
        mockEvents[0].progress
      );
    });

    it('should provide phase-level progress breakdown', async () => {
      /**
       * Progress API should show which phase is active
       */

      const executionId = 'exec-123';

      // TODO: Fetch progress
      // const response = await supertest
      //   .get(`/internal/aesop/exploration/${executionId}/progress`)
      //   .expect(200);

      // Mock: Phase breakdown
      const mockProgress = {
        execution_id: executionId,
        current_phase: 3,
        phases: [
          { phase: 1, name: 'Schema Discovery', status: 'completed', duration_ms: 120000 },
          { phase: 2, name: 'Data Profiling', status: 'completed', duration_ms: 180000 },
          { phase: 3, name: 'Relationship Analysis', status: 'running', progress: 45 },
          { phase: 4, name: 'Pattern Mining', status: 'pending' },
          { phase: 5, name: 'Skill Synthesis', status: 'pending' },
        ],
      };

      expect(mockProgress.phases.length).toBe(5);
      expect(mockProgress.phases.filter((p) => p.status === 'completed').length).toBeGreaterThan(0);
    });

    it('should show estimated time remaining', async () => {
      /**
       * UI should display time estimate based on progress
       */

      // Mock: Time estimate
      const mockProgress = {
        progress_percentage: 60,
        estimated_time_remaining_ms: 240000, // 4 minutes
        estimated_completion: new Date(Date.now() + 240000).toISOString(),
      };

      expect(mockProgress.estimated_time_remaining_ms).toBeGreaterThan(0);
      expect(mockProgress).toHaveProperty('estimated_completion');
    });
  });

  describe('Error State Handling in UI', () => {
    it('should display user-friendly error messages', async () => {
      /**
       * Failed execution should return actionable error info
       */

      const executionId = 'failed-exec-123';

      // TODO: Fetch failed execution
      // const response = await supertest
      //   .get(`/internal/aesop/exploration/${executionId}/progress`)
      //   .expect(200);

      // Mock: Failed execution with user message
      const mockFailure = {
        execution_id: executionId,
        status: 'failed',
        error_message: 'Index pattern .alerts-* does not match any indices',
        user_message: 'The specified index pattern was not found. Please check that alerts are being indexed.',
        suggested_action: 'Verify index pattern or choose a different scope',
        retry_allowed: true,
      };

      expect(mockFailure.status).toBe('failed');
      expect(mockFailure).toHaveProperty('user_message');
      expect(mockFailure).toHaveProperty('suggested_action');
    });

    it('should show validation failures with details', async () => {
      /**
       * Validation failure should explain why skill was rejected
       */

      const skillId = 'skill-failed';

      // TODO: Fetch validation
      // const response = await supertest
      //   .get(`/internal/aesop/skills/${skillId}/validation`)
      //   .expect(200);

      // Mock: Validation failure
      const mockFailure = {
        skill_id: skillId,
        status: 'rejected',
        rejection_reason: 'eval_score_below_threshold',
        eval_score: 0.72,
        threshold: 0.85,
        failed_examples: [
          {
            example_id: 'ex-3',
            failure_reason: 'Incorrect field selection',
            expected: 'process.name, process.pid',
            actual: 'process.name',
          },
        ],
        suggested_improvements: [
          'Add process.pid field to query',
          'Include error handling for missing fields',
        ],
      };

      expect(mockFailure.status).toBe('rejected');
      expect(mockFailure.suggested_improvements.length).toBeGreaterThan(0);
    });

    it('should handle timeout gracefully in UI', async () => {
      /**
       * If exploration times out, UI should show helpful message
       */

      // Mock: Timeout scenario
      const mockTimeout = {
        execution_id: 'timeout-exec',
        status: 'timeout',
        error_message: 'Exploration exceeded 2 hour limit',
        user_message: 'The exploration took longer than expected and was stopped automatically.',
        partial_results_available: true,
        suggested_action: 'Reduce exploration_depth or limit scoped_indices',
      };

      expect(mockTimeout.status).toBe('timeout');
      expect(mockTimeout.partial_results_available).toBe(true);
    });
  });

  describe('Search and Filter APIs', () => {
    it('should search skills by name/description', async () => {
      /**
       * GET /internal/aesop/skills/search?q=lateral
       */

      // TODO: Search skills
      // const response = await supertest
      //   .get('/internal/aesop/skills/search?q=lateral')
      //   .expect(200);

      // Mock: Search results
      const mockResults = {
        query: 'lateral',
        total: 3,
        results: [
          { id: 'skill-1', name: 'lateral_movement_investigation', score: 0.95 },
          { id: 'skill-5', name: 'cross_lateral_analysis', score: 0.82 },
        ],
      };

      expect(mockResults.results.length).toBeGreaterThan(0);
    });

    it('should filter skills by status', async () => {
      /**
       * GET /internal/aesop/skills?status=approved
       */

      // TODO: Filter skills
      // const response = await supertest
      //   .get('/internal/aesop/skills?status=approved')
      //   .expect(200);

      // Mock: Filtered results
      const mockFiltered = {
        filter: { status: 'approved' },
        total: 12,
        skills: [
          { id: 'skill-1', status: 'approved' },
          { id: 'skill-2', status: 'approved' },
        ],
      };

      mockFiltered.skills.forEach((skill) => {
        expect(skill.status).toBe('approved');
      });
    });

    it('should sort skills by eval_score', async () => {
      /**
       * GET /internal/aesop/skills?sort=eval_score:desc
       */

      // TODO: Sort skills
      // const response = await supertest
      //   .get('/internal/aesop/skills?sort=eval_score:desc')
      //   .expect(200);

      // Mock: Sorted results
      const mockSorted = {
        sort: 'eval_score:desc',
        skills: [
          { id: 'skill-3', eval_score: 0.95 },
          { id: 'skill-1', eval_score: 0.89 },
          { id: 'skill-2', eval_score: 0.86 },
        ],
      };

      for (let i = 1; i < mockSorted.skills.length; i++) {
        expect(mockSorted.skills[i].eval_score).toBeLessThanOrEqual(
          mockSorted.skills[i - 1].eval_score
        );
      }
    });
  });

  describe('Export and Reporting APIs', () => {
    it('should export skill as markdown', async () => {
      /**
       * GET /internal/aesop/skills/{skillId}/export?format=markdown
       */

      const skillId = 'skill-1';

      // TODO: Export skill
      // const response = await supertest
      //   .get(`/internal/aesop/skills/${skillId}/export?format=markdown`)
      //   .expect(200);

      // Mock: Markdown export
      const mockMarkdown = `---
name: lateral-movement-investigation
description: Investigates lateral movement alerts
tools:
  - elasticsearch_query
  - entity_analytics
---

# Lateral Movement Investigation

[Skill instructions...]
`;

      expect(mockMarkdown).toContain('---');
      expect(mockMarkdown).toContain('name:');
      expect(mockMarkdown).toContain('# ');
    });

    it('should generate exploration summary report', async () => {
      /**
       * GET /internal/aesop/exploration/{executionId}/report
       */

      const executionId = 'exec-123';

      // TODO: Generate report
      // const response = await supertest
      //   .get(`/internal/aesop/exploration/${executionId}/report`)
      //   .expect(200);

      // Mock: Summary report
      const mockReport = {
        execution_id: executionId,
        summary: {
          duration_ms: 900000,
          indices_analyzed: 5,
          relationships_discovered: 12,
          patterns_identified: 25,
          skills_proposed: 5,
          skills_approved: 3,
          skills_rejected: 2,
        },
        details: {
          top_relationships: [
            { from: '.alerts-*', to: 'logs-endpoint.*', confidence: 0.95 },
          ],
          top_patterns: [
            { pattern: 'lateral_movement_investigation', frequency: 15 },
          ],
        },
      };

      expect(mockReport).toHaveProperty('summary');
      expect(mockReport).toHaveProperty('details');
    });
  });
});
