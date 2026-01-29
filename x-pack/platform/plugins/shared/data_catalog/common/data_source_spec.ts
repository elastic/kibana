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
 * Role of a connector within a data source:
 * - 'primary': Main connector shown first in UI configuration flow (one per data source)
 * - 'required': Must be configured, shown after primary connector
 * - 'optional': User is prompted with a choice before configuration
 */
export type ConnectorRole = 'primary' | 'required' | 'optional';

/**
 * Reference to a created stack connector, including its type for reliable matching.
 */
export interface ConnectorReference {
  /** The connector type (e.g., '.google_drive', '.jina') */
  type: string;
  /** The created connector's ID */
  id: string;
}

/**
 * Configuration for a stack connector associated with a data source type
 */
export interface StackConnectorConfig {
  type: string;
  config: Record<string, unknown>;
  importedTools?: string[];
  /**
   * Role of this connector in the data source configuration flow.
   * - 'primary': Main connector, shown first (default for first connector if not specified)
   * - 'required': Must be configured, flyout shown directly after primary
   * - 'optional': User prompted with y/n before showing configuration flyout
   * @default 'required'
   */
  role?: ConnectorRole;
  /** Display name for this connector (shown in UI) */
  name?: string;
  /** Description explaining what this connector does (shown in UI prompts) */
  description?: string;
  /**
   * Description shown when the user is about to skip an optional connector.
   * Explains what will happen if they skip (e.g., fallback behavior).
   * Only relevant for connectors with role 'optional'.
   */
  skipDescription?: string;
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
   * Generates workflows for interacting with the third-party data source.
   * Workflows are the only model for "taking action" against the third party.
   * @param connectors - Array of connector references (type + id) for connectors created for this data source
   */
  generateWorkflows(connectors: ConnectorReference[]): WorkflowInfo[];

  /**
   * Stack connector configurations.
   * Stack connectors are the only model for executing workflow actions against the third party.
   * This is an array to support composite data sources that use multiple connectors.
   */
  stackConnectors: StackConnectorConfig[];

  /** OAuth configuration for authentication */
  oauthConfiguration?: EARSOAuthConfiguration | CustomOAuthConfiguration;
}
