/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NewIndexDetails {
  indexName: string;
  documentsCount: number;
  sizeInBytes: number | null;
  createdAt: number;
}

/** Which parts of the data panel the caller's index privileges allow, as Elasticsearch reported. */
export interface DataPanelAccess {
  showPanel: boolean;
  showDocuments: boolean;
  showTotalSize: boolean;
}

export interface DeploymentStatsResponse {
  dataPanelAccess: DataPanelAccess;
  indicesCount: number | null;
  dataStreamsCount: number | null;
  vectorCount: number | null;
  storeSizeBytes: number | null;
  dashboardsCount: number | null;
  documentsCount: number | null;
  apiKeysCount: number | null;
  expiringApiKeysCount: number | null;
  newIndex: NewIndexDetails | null;
}

export interface StarredDashboardsCountResponse {
  count: number | null;
}
