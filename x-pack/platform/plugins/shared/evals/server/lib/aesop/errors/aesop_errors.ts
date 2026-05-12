/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

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
  constructor(workflowId: string, failedStep: string, originalError: Error | string) {
    const causeMessage =
      originalError instanceof Error ? originalError.message : String(originalError);
    super(
      `Workflow '${workflowId}' execution failed at step '${failedStep}': ${causeMessage}`,
      'WORKFLOW_EXECUTION_FAILED',
      500,
      true, // Retryable - may be transient
      {
        workflowId,
        failedStep,
        originalError: causeMessage,
      }
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
  constructor(skillId: string, actualScore: number, requiredScore: number) {
    super(
      `Skill '${skillId}' validation score ${actualScore} did not meet required ${requiredScore}. Increase iterations or improve skill to raise the score.`,
      'SKILL_VALIDATION_NOT_PASSED',
      400,
      false,
      { skillId, actualScore, requiredScore }
    );
    this.name = 'SkillValidationNotPassedError';
  }
}

export class SkillAlreadyDeployedError extends AESOPError {
  constructor(skillId: string, agentBuilderSkillId?: string) {
    super(
      agentBuilderSkillId
        ? `Skill '${skillId}' is already deployed to Agent Builder (ID: ${agentBuilderSkillId}). Cannot deploy twice.`
        : `Skill '${skillId}' is already deployed. Cannot duplicate deployment.`,
      'SKILL_ALREADY_DEPLOYED',
      409,
      false,
      { skillId, agentBuilderSkillId }
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
    super(`Evaluation failed for skill '${skillId}': ${cause}`, 'EVALUATION_FAILED', 500, true, {
      skill_id: skillId,
      cause,
    });
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
    super(`Agent '${agentId}' execution failed: ${cause}`, 'AGENT_EXECUTION_FAILED', 500, true, {
      agent_id: agentId,
      cause,
    });
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

interface WithRetryOptions {
  /** Maximum number of retry attempts (not counting the initial attempt) */
  maxRetries: number;
  /** Base delay in milliseconds between retries (default: 1000) */
  retryDelay?: number;
  /** Apply exponential backoff (retryDelay * 2^attempt) */
  exponentialBackoff?: boolean;
  /** Maximum delay cap when using exponential backoff */
  maxRetryDelay?: number;
  /** Add random jitter to retry delays to prevent thundering herd */
  jitter?: boolean;
  /** Overall timeout for all attempts combined (ms) */
  overallTimeout?: number;
  /** Timeout per individual operation invocation (ms) */
  operationTimeout?: number;
  /** Custom retryable error message patterns (substring match) */
  retryableErrors?: string[];
  /** Called before each retry with attempt number, error, and delay */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  /** Called when max retries is exceeded */
  onMaxRetriesExceeded?: (maxRetries: number, error: Error) => void;
  /** Logger for retry events */
  logger?: {
    info?: (msg: string, meta?: Record<string, unknown>) => void;
    warn?: (msg: string, meta?: Record<string, unknown>) => void;
    error?: (msg: string, meta?: Record<string, unknown>) => void;
    debug?: (msg: string, meta?: Record<string, unknown>) => void;
  };
  /** Operation name for logging */
  operation: string;
}

/**
 * Determines if an error is retryable given the configuration
 */
function shouldRetryError(error: unknown, options: WithRetryOptions): boolean {
  // AESOPError with explicit retryable=false → never retry
  if (error instanceof AESOPError && !error.retryable) {
    return false;
  }

  // AESOPError with retryable=true → always retry
  if (error instanceof AESOPError && error.retryable) {
    return true;
  }

  // If custom retryable patterns are provided, ONLY retry if the error matches one
  if (options.retryableErrors && options.retryableErrors.length > 0) {
    const message = getErrorMessage(error);
    return options.retryableErrors.some((pattern) => message.includes(pattern));
  }

  // Default: retry all generic (non-AESOPError) errors unless explicitly filtered
  return true;
}

/**
 * Wraps async operations with error handling and retry logic.
 *
 * Supports exponential backoff, jitter, per-operation timeouts, overall timeouts,
 * custom retryable error patterns, and retry callbacks.
 *
 * Note on fake timers: this implementation uses Promise chaining (not async/await loops)
 * for the retry delay so that `jest.advanceTimersByTime()` works correctly — the setTimeout
 * is always scheduled synchronously in the `.catch()` handler before control returns.
 */
export function withRetry<T>(fn: () => Promise<T>, options: WithRetryOptions): Promise<T> {
  const {
    maxRetries,
    retryDelay = 1000,
    exponentialBackoff = false,
    maxRetryDelay,
    jitter = false,
    overallTimeout,
    operationTimeout,
    onRetry,
    onMaxRetriesExceeded,
    logger,
    operation,
  } = options;

  const startTime = Date.now();

  function attempt(attemptNumber: number): Promise<T> {
    // Check overall timeout
    if (overallTimeout !== undefined && Date.now() - startTime >= overallTimeout) {
      return Promise.reject(
        new Error(`Operation '${operation}' timed out after ${overallTimeout}ms`)
      );
    }

    let operationPromise: Promise<T>;
    try {
      operationPromise = Promise.resolve(fn());
    } catch (syncError) {
      operationPromise = Promise.reject(syncError);
    }

    // Apply per-operation timeout if configured
    if (operationTimeout !== undefined) {
      operationPromise = Promise.race([
        operationPromise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`Operation '${operation}' timed out after ${operationTimeout}ms`)),
            operationTimeout
          )
        ),
      ]);
    }

    return operationPromise.then(
      (result) => {
        if (attemptNumber > 1) {
          logger?.info?.(`Operation succeeded after retry`, { operation, attempt: attemptNumber });
        }
        return result;
      },
      (error: unknown) => {
        const isLastAttempt = attemptNumber > maxRetries;

        if (isLastAttempt || !shouldRetryError(error, options)) {
          if (isLastAttempt && maxRetries > 0) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger?.error?.(`Max retries exceeded for operation`, {
              operation,
              maxRetries,
              lastError: err.message,
            });
            onMaxRetriesExceeded?.(maxRetries, err);
          }
          return Promise.reject(error);
        }

        // Calculate delay for this retry
        let delay = retryDelay;
        if (exponentialBackoff) {
          delay = retryDelay * Math.pow(2, attemptNumber - 1);
        }
        if (maxRetryDelay !== undefined) {
          delay = Math.min(delay, maxRetryDelay);
        }
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }

        const err = error instanceof Error ? error : new Error(String(error));
        logger?.warn?.(`Retrying operation after failure`, {
          operation,
          attempt: attemptNumber,
          maxRetries,
          delayMs: delay,
          error: err.message,
        });
        onRetry?.(attemptNumber, err, delay);

        // Schedule next attempt after delay — this setTimeout is registered synchronously
        // in the .catch() handler, making it compatible with jest.advanceTimersByTime()
        return new Promise<T>((resolve, reject) => {
          setTimeout(() => {
            attempt(attemptNumber + 1).then(resolve, reject);
          }, delay);
        });
      }
    );
  }

  return attempt(1);
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
