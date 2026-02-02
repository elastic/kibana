/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolResult, ToolDefinition } from '@kbn/agent-builder-common';
import pRetry from 'p-retry';

/**
 * Parameters for invoking a skill
 */
export interface InvokeSkillParams {
  /** The ID of the skill/tool to invoke (e.g., "platform.core.search", "observability.get_alerts") */
  skillId: string;
  /** Parameters to pass to the skill */
  params: Record<string, unknown>;
  /** Optional connector ID for skills that require external integrations */
  connectorId?: string;
}

/**
 * Response from invoking a skill
 */
export interface InvokeSkillResponse {
  /** Results returned by the skill execution */
  results: ToolResult[];
  /** Any errors that occurred during execution */
  errors: Array<{ message: string; stack?: string }>;
}

/**
 * Response from listing available skills/tools
 */
export interface ListSkillsResponse {
  /** Available tools/skills */
  results: ToolDefinition[];
}

/**
 * Options for skill client operations
 */
interface SkillClientOptions {
  /** Number of retries for failed requests (default: 2) */
  retries?: number;
  /** Minimum timeout between retries in ms (default: 2000) */
  minTimeout?: number;
}

/**
 * Client for invoking platform skills via the Agent Builder API.
 *
 * This client provides a simplified interface for:
 * - Listing available skills/tools
 * - Invoking skills directly with parameters
 *
 * Skills are invoked via the `/api/agent_builder/tools/_execute` endpoint.
 */
export class AgentBuilderSkillClient {
  private readonly defaultOptions: Required<SkillClientOptions> = {
    retries: 2,
    minTimeout: 2000,
  };

  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  /**
   * Lists all available skills/tools that can be invoked.
   */
  async listSkills(): Promise<ListSkillsResponse> {
    this.log.info('Listing available skills');

    const callListApi = async (): Promise<ListSkillsResponse> => {
      const response = await this.fetch('/api/agent_builder/tools', {
        method: 'GET',
        version: '2023-10-31',
      });

      return response as ListSkillsResponse;
    };

    try {
      return await pRetry(callListApi, {
        retries: this.defaultOptions.retries,
        minTimeout: this.defaultOptions.minTimeout,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

          if (isLastAttempt) {
            this.log.error(
              new Error(`Failed to list skills after ${error.attemptNumber} attempts`, {
                cause: error,
              })
            );
            throw error;
          } else {
            this.log.warning(
              new Error(
                `List skills API call failed on attempt ${error.attemptNumber}; retrying...`,
                {
                  cause: error,
                }
              )
            );
          }
        },
      });
    } catch (error) {
      this.log.error('Error occurred while listing skills');
      return {
        results: [],
      };
    }
  }

  /**
   * Invokes a skill/tool with the given parameters.
   *
   * @param params - The skill invocation parameters
   * @param options - Optional configuration for retries
   * @returns The skill execution results
   *
   * @example
   * ```ts
   * const result = await skillClient.invokeSkill({
   *   skillId: 'platform.core.search',
   *   params: { query: 'error logs', index: 'logs-*' },
   * });
   * ```
   */
  async invokeSkill(
    params: InvokeSkillParams,
    options: SkillClientOptions = {}
  ): Promise<InvokeSkillResponse> {
    const { skillId, params: skillParams, connectorId } = params;
    const { retries, minTimeout } = { ...this.defaultOptions, ...options };

    this.log.info(`Invoking skill: ${skillId}`);

    const callExecuteApi = async (): Promise<InvokeSkillResponse> => {
      const body: Record<string, unknown> = {
        tool_id: skillId,
        tool_params: skillParams,
      };

      if (connectorId) {
        body.connector_id = connectorId;
      }

      const response = await this.fetch('/api/agent_builder/tools/_execute', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify(body),
      });

      const executeResponse = response as { results: ToolResult[] };

      return {
        results: executeResponse.results,
        errors: [],
      };
    };

    try {
      return await pRetry(callExecuteApi, {
        retries,
        minTimeout,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

          if (isLastAttempt) {
            this.log.error(
              new Error(
                `Failed to invoke skill "${skillId}" after ${error.attemptNumber} attempts`,
                {
                  cause: error,
                }
              )
            );
            throw error;
          } else {
            this.log.warning(
              new Error(
                `Skill invocation for "${skillId}" failed on attempt ${error.attemptNumber}; retrying...`,
                { cause: error }
              )
            );
          }
        },
      });
    } catch (error) {
      this.log.error(`Error occurred while invoking skill "${skillId}"`);
      return {
        results: [],
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        ],
      };
    }
  }

  /**
   * Gets details about a specific skill/tool by ID.
   *
   * @param skillId - The ID of the skill to retrieve
   * @returns The skill definition with schema
   */
  async getSkill(skillId: string): Promise<ToolDefinition | null> {
    this.log.info(`Getting skill details: ${skillId}`);

    const callGetApi = async (): Promise<ToolDefinition> => {
      const response = await this.fetch(`/api/agent_builder/tools/${encodeURIComponent(skillId)}`, {
        method: 'GET',
        version: '2023-10-31',
      });

      return response as ToolDefinition;
    };

    try {
      return await pRetry(callGetApi, {
        retries: this.defaultOptions.retries,
        minTimeout: this.defaultOptions.minTimeout,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

          if (isLastAttempt) {
            this.log.error(
              new Error(`Failed to get skill "${skillId}" after ${error.attemptNumber} attempts`, {
                cause: error,
              })
            );
            throw error;
          } else {
            this.log.warning(
              new Error(
                `Get skill "${skillId}" API call failed on attempt ${error.attemptNumber}; retrying...`,
                { cause: error }
              )
            );
          }
        },
      });
    } catch (error) {
      this.log.error(`Error occurred while getting skill "${skillId}"`);
      return null;
    }
  }

  /**
   * Invokes multiple skills in sequence, passing results between them.
   *
   * @param invocations - Array of skill invocations to execute in order
   * @returns Array of results from each skill invocation
   *
   * @example
   * ```ts
   * const results = await skillClient.invokeSkillChain([
   *   { skillId: 'skill1', params: { input: 'data' } },
   *   { skillId: 'skill2', params: { filter: 'active' } },
   * ]);
   * ```
   */
  async invokeSkillChain(invocations: InvokeSkillParams[]): Promise<InvokeSkillResponse[]> {
    const results: InvokeSkillResponse[] = [];

    for (const invocation of invocations) {
      const result = await this.invokeSkill(invocation);
      results.push(result);

      // Stop chain if there are errors
      if (result.errors.length > 0) {
        this.log.warning(`Skill chain stopped due to errors in "${invocation.skillId}"`);
        break;
      }
    }

    return results;
  }
}
