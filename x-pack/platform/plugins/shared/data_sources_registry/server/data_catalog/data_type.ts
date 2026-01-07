/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * OAuth providers supported by EARS
 */
export enum EARSSupportedOAuthProvider {
  GITHUB = 'github',
  GOOGLE = 'google',
  NOTION = 'notion',
}

/**
 * Represents a workflow that can be generated for a data source type
 */
export interface WorkflowInfo {
  /** Complete workflow content including references to any required stack connector IDs */
  content: string;
  /** Whether an Agent Builder tool should be generated for this workflow */
  shouldGenerateABTool: boolean;
}

/**
 * Reference to a workflow in a third-party workflow registry
 */
export interface WorkflowReference {
  /** Unique identifier of the workflow in the registry */
  id: string;
  /**
   * Optional override to control AB tool generation.
   * If not specified, the registry's default behavior will be used.
   */
  shouldGenerateABTool?: boolean;
}

/**
 * Configuration for OAuth authentication using EARS (Elastic-owned OAuth apps)
 */
export interface EARSOAuthConfiguration {
  provider: EARSSupportedOAuthProvider;
  scopes?: string[];
  initiatePath: string;
  fetchSecretsPath: string;
  oauthBaseUrl: string;
}

// This is subject to change once we know more about custom OAuth apps
export interface CustomOAuthConfiguration {
  initiatePath: string;
  fetchSecretsPath: string;
}

/**
 * Configuration for a stack connector associated with a data source type
 */
export interface StackConnectorConfig {
  type: string;
  config: Record<string, unknown>;
}

/**
 * Workflow configuration for a data type.
 * Supports three approaches:
 * 1. Local directory: { directory: '/path/to/workflows' }
 * 2. Registry references: { registry: [{ id: 'workflow-1' }, { id: 'workflow-2' }] }
 * 3. Mixed: { directory: '/path', registry: [...] }
 */
export interface WorkflowsConfig {
  /** Path to directory containing local workflow YAML files */
  directory?: string;
  /** Array of workflow references from a third-party registry */
  registry?: WorkflowReference[];
}

/**
 * Abstraction defining a federated data source ("fetcher").
 * This defines:
 * - Connectivity (OAuth) configuration
 * - What workflows should be created
 * - How to interact with data stored in third-party systems
 *
 */
export interface DataTypeDefinition {
  /** Unique identifier for the data type */
  id: string;
  /** Display name for the data type */
  name: string;
  /** Optional description of the data type */
  description?: string;

  /**
   * Workflow configuration. Supports three formats:
   *
   * 1. String (directory path): '/path/to/workflows'
   *    - YAML files can use `{{stackConnectorId}}` template variable
   *    - Agent Builder tool generation controlled by 'agent-builder-tool' tag in YAML
   *
   * 2. Array (registry references): [{ id: 'workflow-1' }, { id: 'workflow-2' }]
   *    - References workflows from a third-party registry
   *    - Registry client will fetch workflow definitions
   *    - Optional shouldGenerateABTool override per workflow
   *
   * 3. Object (mixed): { directory: '/path', registry: [...] }
   *    - Combines both local files and registry workflows
   */
  workflows: string | WorkflowReference[] | WorkflowsConfig;

  /**
   * Stack connector configuration.
   * Stack connectors are the only model for executing workflow actions against the third party.
   */
  stackConnector: StackConnectorConfig;

  /** OAuth configuration for authentication */
  oauthConfiguration?: EARSOAuthConfiguration | CustomOAuthConfiguration;
}
