/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Error Types - Production-Grade Error Handling
 *
 * Defines custom error classes for AESOP workflows with proper error codes,
 * retry logic, and user-friendly messages.
 */

export class AESOPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly retryable: boolean = false,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AESOPError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        retryable: this.retryable,
        metadata: this.metadata,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ERRORS
// ═══════════════════════════════════════════════════════════════

export class WorkflowNotFoundError extends AESOPError {
  constructor(workflowId: string) {
    super(
      `Workflow '${workflowId}' not found. Ensure workflow YAML is deployed.`,
      'WORKFLOW_NOT_FOUND',
      404,
      false,
      { workflow_id: workflowId }
    );
    this.name = 'WorkflowNotFoundError';
  }
}

export class WorkflowExecutionError extends AESOPError {
  constructor(workflowId: string, executionId: string, cause: string) {
    super(
      `Workflow '${workflowId}' execution failed: ${cause}`,
      'WORKFLOW_EXECUTION_FAILED',
      500,
      true, // Retryable - may be transient
      { workflow_id: workflowId, execution_id: executionId, cause }
    );
    this.name = 'WorkflowExecutionError';
  }
}

export class WorkflowTimeoutError extends AESOPError {
  constructor(workflowId: string, timeoutSeconds: number) {
    super(
      `Workflow '${workflowId}' exceeded timeout of ${timeoutSeconds}s. This may indicate agent is stuck or exploring too many indices.`,
      'WORKFLOW_TIMEOUT',
      408,
      true,
      { workflow_id: workflowId, timeout_seconds: timeoutSeconds }
    );
    this.name = 'WorkflowTimeoutError';
  }
}

// ═══════════════════════════════════════════════════════════════
// SKILL ERRORS
// ═══════════════════════════════════════════════════════════════

export class SkillNotFoundError extends AESOPError {
  constructor(skillId: string) {
    super(
      `Proposed skill '${skillId}' not found in .aesop-proposed-skills index.`,
      'SKILL_NOT_FOUND',
      404,
      false,
      { skill_id: skillId }
    );
    this.name = 'SkillNotFoundError';
  }
}

export class SkillValidationNotPassedError extends AESOPError {
  constructor(skillId: string, currentStatus: string) {
    super(
      `Skill '${skillId}' cannot be approved - validation status is '${currentStatus}'. Skill must pass validation before approval.`,
      'SKILL_VALIDATION_NOT_PASSED',
      400,
      false,
      { skill_id: skillId, validation_status: currentStatus }
    );
    this.name = 'SkillValidationNotPassedError';
  }
}

export class SkillAlreadyDeployedError extends AESOPError {
  constructor(skillId: string, agentBuilderSkillId: string) {
    super(
      `Skill '${skillId}' is already deployed to Agent Builder (ID: ${agentBuilderSkillId}). Cannot deploy twice.`,
      'SKILL_ALREADY_DEPLOYED',
      409,
      false,
      { skill_id: skillId, agent_builder_skill_id: agentBuilderSkillId }
    );
    this.name = 'SkillAlreadyDeployedError';
  }
}

export class SkillGenerationError extends AESOPError {
  constructor(patternId: string, cause: string) {
    super(
      `Failed to generate skill from pattern '${patternId}': ${cause}`,
      'SKILL_GENERATION_FAILED',
      500,
      true,
      { pattern_id: patternId, cause }
    );
    this.name = 'SkillGenerationError';
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION ERRORS
// ═══════════════════════════════════════════════════════════════

export class ValidationConvergenceError extends AESOPError {
  constructor(skillId: string, maxIterations: number, finalScore: number, threshold: number) {
    super(
      `Skill '${skillId}' failed to converge after ${maxIterations} iterations. Final score: ${finalScore}, threshold: ${threshold}. Skill may need manual review.`,
      'VALIDATION_CONVERGENCE_FAILED',
      400,
      false,
      { skill_id: skillId, max_iterations: maxIterations, final_score: finalScore, threshold }
    );
    this.name = 'ValidationConvergenceError';
  }
}

export class TraceNotFoundError extends AESOPError {
  constructor(traceId: string) {
    super(
      `OTEL trace '${traceId}' not found in traces-* indices. Ensure telemetry.tracing.enabled: true in kibana.yml and EDOT collector is running.`,
      'TRACE_NOT_FOUND',
      404,
      true, // May be eventual consistency issue
      { trace_id: traceId }
    );
    this.name = 'TraceNotFoundError';
  }
}

export class EvaluationError extends AESOPError {
  constructor(skillId: string, cause: string) {
    super(
      `Evaluation failed for skill '${skillId}': ${cause}`,
      'EVALUATION_FAILED',
      500,
      true,
      { skill_id: skillId, cause }
    );
    this.name = 'EvaluationError';
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT ERRORS
// ═══════════════════════════════════════════════════════════════

export class AgentNotFoundError extends AESOPError {
  constructor(agentId: string) {
    super(
      `Agent Builder agent '${agentId}' not found. AESOP custom agents must be created before workflows can run. Check that agents were auto-created on plugin start.`,
      'AGENT_NOT_FOUND',
      404,
      false,
      { agent_id: agentId, suggested_fix: 'Restart Kibana to trigger agent creation' }
    );
    this.name = 'AgentNotFoundError';
  }
}

export class AgentExecutionError extends AESOPError {
  constructor(agentId: string, cause: string) {
    super(
      `Agent '${agentId}' execution failed: ${cause}`,
      'AGENT_EXECUTION_FAILED',
      500,
      true,
      { agent_id: agentId, cause }
    );
    this.name = 'AgentExecutionError';
  }
}

// ═══════════════════════════════════════════════════════════════
// ELASTICSEARCH ERRORS
// ═══════════════════════════════════════════════════════════════

export class IndexNotFoundError extends AESOPError {
  constructor(index: string) {
    super(
      `Index '${index}' not found. Agent cannot explore non-existent indices.`,
      'INDEX_NOT_FOUND',
      404,
      false,
      { index }
    );
    this.name = 'IndexNotFoundError';
  }
}

export class ReadOnlyViolationError extends AESOPError {
  constructor(operation: string) {
    super(
      `Operation '${operation}' violates read-only constraint. AESOP exploration must only perform read operations (GET, POST /_search). Write operations are forbidden.`,
      'READ_ONLY_VIOLATION',
      403,
      false,
      { operation, severity: 'CRITICAL' }
    );
    this.name = 'ReadOnlyViolationError';
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION ERRORS
// ═══════════════════════════════════════════════════════════════

export class PluginNotAvailableError extends AESOPError {
  constructor(pluginName: string, requiredFor: string) {
    super(
      `Required plugin '${pluginName}' is not available. ${requiredFor} requires this plugin. Ensure plugin is installed and enabled in kibana.yml.`,
      'PLUGIN_NOT_AVAILABLE',
      503,
      false,
      { plugin: pluginName, required_for: requiredFor }
    );
    this.name = 'PluginNotAvailableError';
  }
}

export class ConnectorNotConfiguredError extends AESOPError {
  constructor(connectorId?: string) {
    super(
      connectorId
        ? `Connector '${connectorId}' not found or not configured.`
        : `No LLM connector configured. AESOP requires at least one connector for agent execution.`,
      'CONNECTOR_NOT_CONFIGURED',
      400,
      false,
      { connector_id: connectorId, suggested_fix: 'Configure connector in Kibana UI or kibana.yml' }
    );
    this.name = 'ConnectorNotConfiguredError';
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Wraps async operations with error handling and retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    operation: string;
  }
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, operation } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error instanceof AESOPError && error.retryable;
      const isLastAttempt = attempt === maxRetries;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
    }
  }

  throw new Error(`Operation '${operation}' failed after ${maxRetries} attempts`);
}

/**
 * Safely extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Checks if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AESOPError) {
    return error.retryable;
  }

  // Check for known retryable ES errors
  const message = getErrorMessage(error);
  return (
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('unavailable') ||
    message.includes('429') // Rate limit
  );
}
