/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Workflow State Tracker - Real-Time Progress Updates
 *
 * Tracks execution state of AESOP workflows in Elasticsearch index.
 * Provides detailed progress information for UI polling.
 *
 * Features:
 * - Phase-level progress tracking (1-5)
 * - Step-level granularity
 * - Progress percentage calculation
 * - Estimated time remaining
 * - Phase duration metrics
 *
 * Usage:
 * ```typescript
 * const tracker = new WorkflowStateTracker(esClient, logger);
 * await tracker.initializeExecution(executionId, 'aesop.self_exploration');
 * await tracker.updateProgress(executionId, 1, 'discover_indices', 2, 50);
 * await tracker.completePhase(executionId, 1, 120000);
 * const state = await tracker.getExecutionState(executionId);
 * ```
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface WorkflowPhaseState {
  phase_number: number;
  phase_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowExecutionState {
  execution_id: string;
  workflow_name: string;
  status: 'running' | 'completed' | 'failed';
  current_phase: 1 | 2 | 3 | 4 | 5;
  current_step: string;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  estimated_time_remaining_ms: number;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
  phases: WorkflowPhaseState[];
}

const WORKFLOW_EXECUTIONS_INDEX = '.aesop-workflow-executions';

/**
 * Phase definitions for self-exploration workflow
 * Maps phase numbers to names and expected step counts
 */
const SELF_EXPLORATION_PHASES = [
  { phase_number: 1, phase_name: 'Schema Discovery', expected_steps: 4, avg_duration_ms: 120000 },
  { phase_number: 2, phase_name: 'Data Profiling', expected_steps: 3, avg_duration_ms: 180000 },
  {
    phase_number: 3,
    phase_name: 'Relationship Analysis',
    expected_steps: 4,
    avg_duration_ms: 300000,
  },
  { phase_number: 4, phase_name: 'Pattern Mining', expected_steps: 3, avg_duration_ms: 240000 },
  { phase_number: 5, phase_name: 'Skill Synthesis', expected_steps: 4, avg_duration_ms: 180000 },
];

const TOTAL_STEPS = SELF_EXPLORATION_PHASES.reduce((sum, p) => sum + p.expected_steps, 0);

export class WorkflowStateTracker {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  /**
   * Ensure the workflow executions index exists
   */
  async ensureIndexExists(): Promise<void> {
    try {
      const exists = await this.esClient.indices.exists({
        index: WORKFLOW_EXECUTIONS_INDEX,
      });

      if (!exists) {
        await this.esClient.indices.create({
          index: WORKFLOW_EXECUTIONS_INDEX,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            'index.hidden': true,
            'index.lifecycle.name': 'aesop-lifecycle',
          },
          mappings: {
            properties: {
              execution_id: { type: 'keyword' },
              workflow_name: { type: 'keyword' },
              status: { type: 'keyword' },
              current_phase: { type: 'integer' },
              current_step: { type: 'keyword' },
              total_steps: { type: 'integer' },
              completed_steps: { type: 'integer' },
              progress_percentage: { type: 'integer' },
              estimated_time_remaining_ms: { type: 'long' },
              started_at: { type: 'date' },
              updated_at: { type: 'date' },
              completed_at: { type: 'date' },
              error_message: { type: 'text' },
              phases: {
                type: 'nested',
                properties: {
                  phase_number: { type: 'integer' },
                  phase_name: { type: 'keyword' },
                  status: { type: 'keyword' },
                  duration_ms: { type: 'long' },
                  started_at: { type: 'date' },
                  completed_at: { type: 'date' },
                },
              },
            },
          },
        });

        this.logger.info(`[WorkflowStateTracker] Created index: ${WORKFLOW_EXECUTIONS_INDEX}`);
      }
    } catch (error) {
      this.logger.error(
        `[WorkflowStateTracker] Failed to ensure index exists: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Initialize a new workflow execution
   */
  async initializeExecution(executionId: string, workflowName: string): Promise<void> {
    await this.ensureIndexExists();

    const now = new Date().toISOString();

    const initialState: WorkflowExecutionState = {
      execution_id: executionId,
      workflow_name: workflowName,
      status: 'running',
      current_phase: 1,
      current_step: 'Initializing...',
      total_steps: TOTAL_STEPS,
      completed_steps: 0,
      progress_percentage: 0,
      estimated_time_remaining_ms: this.calculateTotalEstimatedDuration(),
      started_at: now,
      updated_at: now,
      phases: SELF_EXPLORATION_PHASES.map((p) => ({
        phase_number: p.phase_number as 1 | 2 | 3 | 4 | 5,
        phase_name: p.phase_name,
        status: p.phase_number === 1 ? 'running' : 'pending',
        started_at: p.phase_number === 1 ? now : undefined,
      })),
    };

    try {
      await this.esClient.index({
        index: WORKFLOW_EXECUTIONS_INDEX,
        id: executionId,
        document: initialState,
        refresh: 'wait_for',
      });

      this.logger.debug(`[WorkflowStateTracker] Initialized execution: ${executionId}`);
    } catch (error) {
      this.logger.error(
        `[WorkflowStateTracker] Failed to initialize execution execution_id=${executionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Update progress within a phase
   */
  async updateProgress(
    executionId: string,
    phaseNumber: 1 | 2 | 3 | 4 | 5,
    stepName: string,
    completedSteps: number,
    progressPercentage: number
  ): Promise<void> {
    const now = new Date().toISOString();

    try {
      const state = await this.getExecutionState(executionId);
      if (!state) {
        this.logger.warn(
          `[WorkflowStateTracker] Execution not found, cannot update progress execution_id=${executionId}`
        );
        return;
      }

      const estimatedRemaining = this.calculateEstimatedTimeRemaining(
        state,
        phaseNumber,
        progressPercentage
      );

      await this.esClient.update({
        index: WORKFLOW_EXECUTIONS_INDEX,
        id: executionId,
        doc: {
          current_phase: phaseNumber,
          current_step: stepName,
          completed_steps: completedSteps,
          progress_percentage: progressPercentage,
          estimated_time_remaining_ms: estimatedRemaining,
          updated_at: now,
        },
        refresh: 'wait_for',
      });

      this.logger.debug(
        `[WorkflowStateTracker] Updated progress for execution: ${executionId} phase=${phaseNumber} step=${stepName} progress=${progressPercentage}`
      );
    } catch (error) {
      this.logger.error(
        `[WorkflowStateTracker] Failed to update progress execution_id=${executionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Mark a phase as completed
   */
  async completePhase(
    executionId: string,
    phaseNumber: 1 | 2 | 3 | 4 | 5,
    durationMs: number
  ): Promise<void> {
    const now = new Date().toISOString();

    try {
      const state = await this.getExecutionState(executionId);
      if (!state) {
        this.logger.warn(
          `[WorkflowStateTracker] Execution not found, cannot complete phase execution_id=${executionId}`
        );
        return;
      }

      const updatedPhases = state.phases.map((p) => {
        if (p.phase_number === phaseNumber) {
          return {
            ...p,
            status: 'completed' as const,
            duration_ms: durationMs,
            completed_at: now,
          };
        }
        // Start next phase
        if (p.phase_number === phaseNumber + 1) {
          return {
            ...p,
            status: 'running' as const,
            started_at: now,
          };
        }
        return p;
      });

      await this.esClient.update({
        index: WORKFLOW_EXECUTIONS_INDEX,
        id: executionId,
        doc: {
          phases: updatedPhases,
          updated_at: now,
        },
        refresh: 'wait_for',
      });

      this.logger.debug(
        `[WorkflowStateTracker] Completed phase ${phaseNumber} for execution: ${executionId} duration_ms=${durationMs}`
      );
    } catch (error) {
      this.logger.error(
        `[WorkflowStateTracker] Failed to complete phase execution_id=${executionId} phase=${phaseNumber}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Mark execution as completed
   */
  async completeExecution(executionId: string): Promise<void> {
    const now = new Date().toISOString();

    try {
      await this.esClient.update({
        index: WORKFLOW_EXECUTIONS_INDEX,
        id: executionId,
        doc: {
          status: 'completed',
          progress_percentage: 100,
          estimated_time_remaining_ms: 0,
          completed_at: now,
          updated_at: now,
        },
        refresh: 'wait_for',
      });

      this.logger.info(`[WorkflowStateTracker] Completed execution: ${executionId}`);
    } catch (error) {
      this.logger.error(
        `[WorkflowStateTracker] Failed to complete execution execution_id=${executionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Mark execution as failed
   */
  async failExecution(executionId: string, errorMessage: string): Promise<void> {
    const now = new Date().toISOString();

    try {
      const state = await this.getExecutionState(executionId);
      if (!state) {
        this.logger.warn(
          `[WorkflowStateTracker] Execution not found, cannot fail it execution_id=${executionId}`
        );
        return;
      }

      const updatedPhases = state.phases.map((p) => {
        if (p.status === 'running') {
          return {
            ...p,
            status: 'failed' as const,
            completed_at: now,
          };
        }
        return p;
      });

      await this.esClient.update({
        index: WORKFLOW_EXECUTIONS_INDEX,
        id: executionId,
        doc: {
          status: 'failed',
          error_message: errorMessage,
          phases: updatedPhases,
          completed_at: now,
          updated_at: now,
        },
        refresh: 'wait_for',
      });

      this.logger.warn(
        `[WorkflowStateTracker] Failed execution: ${executionId} error=${errorMessage}`
      );
    } catch (error) {
      this.logger.error(
        `[WorkflowStateTracker] Failed to mark execution as failed execution_id=${executionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get current execution state
   */
  async getExecutionState(executionId: string): Promise<WorkflowExecutionState | null> {
    try {
      const result = await this.esClient.get<WorkflowExecutionState>({
        index: WORKFLOW_EXECUTIONS_INDEX,
        id: executionId,
      });

      return result._source || null;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      this.logger.error(
        `[WorkflowStateTracker] Failed to get execution state execution_id=${executionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Calculate total estimated duration for all phases
   */
  private calculateTotalEstimatedDuration(): number {
    return SELF_EXPLORATION_PHASES.reduce((sum, p) => sum + p.avg_duration_ms, 0);
  }

  /**
   * Calculate estimated time remaining based on current progress
   */
  private calculateEstimatedTimeRemaining(
    state: WorkflowExecutionState,
    currentPhase: number,
    progressPercentage: number
  ): number {
    // If we have actual duration data from completed phases, use it
    const completedPhases = state.phases.filter((p) => p.status === 'completed');
    void completedPhases.reduce((sum, p) => sum + (p.duration_ms || 0), 0);

    // Estimate remaining phases based on average durations
    const remainingPhases = SELF_EXPLORATION_PHASES.filter((p) => p.phase_number > currentPhase);
    const estimatedRemainingDuration = remainingPhases.reduce(
      (sum, p) => sum + p.avg_duration_ms,
      0
    );

    // Estimate current phase remaining time
    const currentPhaseConfig = SELF_EXPLORATION_PHASES.find((p) => p.phase_number === currentPhase);
    const currentPhaseEstimate = currentPhaseConfig
      ? currentPhaseConfig.avg_duration_ms * (1 - progressPercentage / 100)
      : 0;

    return Math.max(0, estimatedRemainingDuration + currentPhaseEstimate);
  }
}
