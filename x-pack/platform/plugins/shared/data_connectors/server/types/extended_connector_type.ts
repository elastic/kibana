/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';

/**
 * Extended metadata for workplace connectors.
 * This extends the base SubActionConnectorType with additional metadata
 * that gets stored in the actions registry.
 */
export interface WorkplaceConnectorMetadata {
  /**
   * OAuth configuration for federated connectors
   */
  workplaceMetadata?: {
    oauth?: {
      provider: string;
      scopes?: string[];
      initiatePath: string;
      fetchSecretsPath: string;
      oauthBaseUrl: string;
    };

    /**
     * Workflow template generator functions
     * Maps workflow ID to a function that generates YAML given a stack connector ID
     */
    workflowTemplates?: Record<string, (stackConnectorId: string) => string>;

    /**
     * Tool generation configuration
     */
    toolGeneration?: {
      enabled: boolean;
      toolConfigs: Array<{
        workflowId: string;
        toolName: string;
        toolDescription: string;
      }>;
    };

    /**
     * UI configuration overrides
     */
    ui?: {
      customFlyoutComponent?: string;
      hideFromConnectorsList?: boolean;
    };

    /**
     * Additional features this connector supports
     */
    features?: string[];
  };
}

/**
 * Extended connector type that includes workplace metadata
 */
export type ExtendedConnectorType<Config = any, Secrets = any> = SubActionConnectorType<
  Config,
  Secrets
> &
  WorkplaceConnectorMetadata;
