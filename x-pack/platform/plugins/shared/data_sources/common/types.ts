/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DeleteDataSourceAndRelatedResourcesResult {
  success: boolean;
  fullyDeleted: boolean;
  remaining?: {
    kscIds: string[];
    toolIds: string[];
    workflowIds: string[];
  };
}

export interface BulkDeleteDataSourceResult extends DeleteDataSourceAndRelatedResourcesResult {
  id: string;
  error?: string;
}

export interface BulkDeleteDataSourcesResponse {
  results: BulkDeleteDataSourceResult[];
}
