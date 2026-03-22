/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';

export interface QueryTestResult {
  success: boolean;
  rows: Array<Record<string, any>>;
  rowCount: number;
  duration_ms: number;
  agent: {
    id: string;
    hostname: string;
    platform: string;
  };
  error?: string;
}

/**
 * Service for testing osquery queries in sandbox environment
 * Executes queries against test agents to validate before deployment
 */
export class QuerySandboxService {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly fleet: FleetStartContract | undefined,
    private readonly logger: Logger
  ) {}

  /**
   * Test query against a live agent
   * @param query - osquery SQL query to test
   * @param targetAgentId - Optional specific agent ID to target (uses first available if not specified)
   * @param platform - Optional platform filter (linux, darwin, windows)
   */
  async testQuery(
    query: string,
    targetAgentId?: string,
    platform?: 'linux' | 'darwin' | 'windows'
  ): Promise<QueryTestResult> {
    this.logger.info(`Testing query in sandbox${targetAgentId ? ` on agent ${targetAgentId}` : ''}`);

    const startTime = Date.now();

    try {
      // Find suitable test agent
      const agent = await this.findTestAgent(targetAgentId, platform);

      if (!agent) {
        return {
          success: false,
          rows: [],
          rowCount: 0,
          duration_ms: Date.now() - startTime,
          agent: {
            id: 'none',
            hostname: 'N/A',
            platform: platform || 'unknown',
          },
          error: 'No suitable test agent found - ensure agents are enrolled with osquery integration',
        };
      }

      // Execute query via osquery_manager
      const result = await this.executeQueryOnAgent(agent.id, query);

      return {
        success: true,
        rows: result.rows || [],
        rowCount: result.rows?.length || 0,
        duration_ms: Date.now() - startTime,
        agent: {
          id: agent.id,
          hostname: agent.hostname || 'unknown',
          platform: agent.platform || 'unknown',
        },
      };
    } catch (error) {
      this.logger.error(`Query sandbox test failed: ${error.message}`);

      return {
        success: false,
        rows: [],
        rowCount: 0,
        duration_ms: Date.now() - startTime,
        agent: {
          id: targetAgentId || 'unknown',
          hostname: 'unknown',
          platform: platform || 'unknown',
        },
        error: error.message,
      };
    }
  }

  /**
   * Find suitable test agent
   */
  private async findTestAgent(
    targetAgentId?: string,
    platform?: string
  ): Promise<{ id: string; hostname?: string; platform?: string } | null> {
    if (!this.fleet) {
      this.logger.warn('Fleet not available for sandbox testing');
      return null;
    }

    try {
      // If specific agent requested, use it
      if (targetAgentId) {
        const agent = await this.fleet.agentService.getAgent(targetAgentId);

        if (agent) {
          return {
            id: agent.id,
            hostname: agent.local_metadata?.host?.hostname,
            platform: agent.local_metadata?.os?.platform,
          };
        }
      }

      // Otherwise, find first healthy agent with osquery integration
      const { agents } = await this.fleet.agentService.listAgents({
        perPage: 20,
        showInactive: false,
      });

      for (const agent of agents) {
        // Check if agent has osquery integration
        const hasOsquery = agent.policy_id; // Simplified check

        if (hasOsquery) {
          // Check platform match if specified
          const agentPlatform = agent.local_metadata?.os?.platform;

          if (!platform || agentPlatform === platform) {
            return {
              id: agent.id,
              hostname: agent.local_metadata?.host?.hostname,
              platform: agentPlatform,
            };
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to find test agent: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute query on specific agent using osquery live query API
   */
  private async executeQueryOnAgent(
    agentId: string,
    query: string
  ): Promise<{ rows: Array<Record<string, any>> }> {
    this.logger.debug(`Executing query on agent ${agentId}: ${query}`);

    try {
      // Use Fleet's package policy to send osquery query
      // This creates a live query action that the agent will execute

      const actionId = `compliance-sandbox-${Date.now()}`;

      // Create action document in .fleet-actions index
      await this.esClient.index({
        index: '.fleet-actions',
        document: {
          '@timestamp': new Date().toISOString(),
          action_id: actionId,
          type: 'INPUT_ACTION',
          input_type: 'osquery',
          agents: [agentId],
          data: {
            query,
            id: actionId,
          },
          timeout: 60, // 60 second timeout
          expiration: new Date(Date.now() + 300000).toISOString(), // 5 min expiration
        },
        refresh: 'wait_for',
      });

      this.logger.info(`Created live query action ${actionId} for agent ${agentId}`);

      // Wait for agent to respond (poll for results)
      const results = await this.pollForQueryResults(actionId, agentId, 30000); // 30s timeout

      return {
        rows: results?.rows || [],
      };
    } catch (error) {
      this.logger.error(`Failed to execute query on agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Poll for query results from agent
   */
  private async pollForQueryResults(
    actionId: string,
    agentId: string,
    timeoutMs: number
  ): Promise<{ rows: Array<Record<string, any>> } | null> {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every second

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check for action result in .fleet-actions-results index
        const response = await this.esClient.search({
          index: '.fleet-actions-results',
          body: {
            query: {
              bool: {
                must: [{ term: { action_id: actionId } }, { term: { agent_id: agentId } }],
              },
            },
            size: 1,
            sort: [{ '@timestamp': 'desc' }],
          },
        });

        if (response.hits.total.value > 0) {
          const result = response.hits.hits[0]._source as any;

          if (result.data?.osquery) {
            // osquery results found
            return {
              rows: result.data.osquery.rows || [],
            };
          }

          if (result.error) {
            throw new Error(`Query execution failed: ${result.error}`);
          }
        }
      } catch (error) {
        // Ignore polling errors, continue waiting
        this.logger.debug(`Polling iteration failed: ${error.message}`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Query execution timeout after ${timeoutMs}ms`);
  }

  // Add esClient to constructor
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly fleet: FleetStartContract | undefined,
    private readonly esClient: any, // ElasticsearchClient
    private readonly logger: Logger
  ) {}

  /**
   * Test query performance impact
   * Estimates CPU/memory impact without actually running query
   */
  async estimatePerformanceImpact(query: string): Promise<{
    estimatedCpuUsage: 'low' | 'medium' | 'high';
    estimatedMemoryMb: number;
    estimatedDurationMs: number;
    recommendation: string;
  }> {
    const upperQuery = query.toUpperCase();

    let cpuUsage: 'low' | 'medium' | 'high' = 'low';
    let estimatedMemory = 10; // Base memory in MB
    let estimatedDuration = 100; // Base duration in ms

    // Analyze query complexity
    if (upperQuery.includes('JOIN')) {
      cpuUsage = 'high';
      estimatedMemory += 50;
      estimatedDuration += 1000;
    }

    if (upperQuery.includes('SELECT *')) {
      estimatedMemory += 20;
      estimatedDuration += 200;
    }

    if (!upperQuery.includes('WHERE') && !upperQuery.includes('LIMIT')) {
      cpuUsage = cpuUsage === 'low' ? 'medium' : 'high';
      estimatedMemory += 30;
      estimatedDuration += 500;
    }

    let recommendation = 'Query should perform well';

    if (cpuUsage === 'high') {
      recommendation = 'Query may have high CPU impact - test in staging before production deployment';
    } else if (cpuUsage === 'medium') {
      recommendation = 'Query has moderate resource usage - monitor agent performance';
    }

    return {
      estimatedCpuUsage: cpuUsage,
      estimatedMemoryMb: estimatedMemory,
      estimatedDurationMs: estimatedDuration,
      recommendation,
    };
  }
}
