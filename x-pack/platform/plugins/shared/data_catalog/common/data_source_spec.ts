/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectAttributes } from '@kbn/core/server';

/**
 * Type for Stack connector secrets.
 */
export interface ConnectorSecrets extends SavedObjectAttributes {
  token?: string;
  apiKey?: string;
  user?: string;
  password?: string;
  secretHeaders?: Record<string, string>;
}

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
  importedTools?: string[];
}

/**
 * Workflow configuration for a data source.
 * Workflows are loaded from YAML files in the specified directory.
 */
export interface WorkflowsConfig {
  /** Absolute path to directory containing workflow YAML files (use join(__dirname, 'workflows')) */
  directory: string;
  /** Template variables to inject into workflow YAMLs (replaces <%= key %> patterns) */
  templateInputs?: Record<string, string>;
}

/**
 * Abstraction defining a federated data source ("fetcher").
 * This defines:
 * - Connectivity (OAuth) configuration
 * - What workflows should be created
 * - How to interact with data stored in third-party systems
 *
 */
export interface DataSource {
  /** Unique identifier for the data type */
  id: string;
  /** Display name for the data type */
  name: string;
  /** Optional description of the data type */
  description?: string;
  /**
   * Icon type for UI display (e.g., '.github', '.notion', '.salesforce').
   * This determines which icon to show in the UI and is separate from the stack connector type.
   * Must correspond to an icon registered in @kbn/connector-specs ConnectorIconsMap.
   */
  iconType: string;

  /**
   * How to load up workflows definitions for this data source type.
   * Workflows are the only model for "taking action" against the third party.
   * */
  workflows: WorkflowsConfig;

  /**
   * Stack connector configuration.
   * Stack connectors are the only model for executing workflow actions against the third party.
   */
  stackConnector: StackConnectorConfig;

  /** OAuth configuration for authentication */
  oauthConfiguration?: EARSOAuthConfiguration | CustomOAuthConfiguration;
}
