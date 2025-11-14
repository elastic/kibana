/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WorkplaceConnectorAttributes {
  name: string;
  type: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Legacy single workflow id (kept for backwards compatibility)
  workflowId?: string;
  // Selected feature flags for this connector (e.g., ['search_web'])
  features?: string[];
  // Created workflow ids per selected feature
  workflowIds?: string[];
  // Created onechat tool ids per selected feature
  toolIds?: string[];
}

export interface WorkplaceConnector extends WorkplaceConnectorAttributes {
  id: string;
}

// For API responses, we redact secrets
export interface WorkplaceConnectorResponse extends Omit<WorkplaceConnector, 'secrets'> {
  hasSecrets: boolean;
}

export interface CreateWorkplaceConnectorRequest {
  name: string;
  type: string;
  config?: Record<string, unknown>;
  secrets: Record<string, unknown>;
  features?: string[];
}

export interface UpdateWorkplaceConnectorRequest {
  name?: string;
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  features?: string[];
}

export const WORKPLACE_CONNECTOR_TYPES = {
  BRAVE_SEARCH: 'brave_search',
  GOOGLE_DRIVE: 'google_drive',
  NOTION: 'notion',
} as const;

export type WorkplaceConnectorType =
  (typeof WORKPLACE_CONNECTOR_TYPES)[keyof typeof WORKPLACE_CONNECTOR_TYPES];
