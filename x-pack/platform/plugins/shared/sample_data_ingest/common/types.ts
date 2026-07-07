/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum InstallationStatus {
  Installed = 'installed',
  Uninstalled = 'uninstalled',
  Installing = 'installing',
  Error = 'error',
}

export interface StatusResponse {
  status: InstallationStatus;
  indexName?: string;
  dashboardId?: string;
  taskId?: string;
  error?: string;
}

export interface SampleDataResponse {
  status: InstallationStatus;
  error?: string;
}

export interface InstalledResponse extends SampleDataResponse {
  status: InstallationStatus.Installed;
  indexName: string;
  dashboardId: string;
}

export interface InstallingResponse extends SampleDataResponse {
  status: InstallationStatus.Installing;
  taskId: string;
}

export interface SampleDataInstallState {
  status: InstallationStatus;
  indexName?: string;
  dashboardId?: string;
  taskId?: string;
  error?: string;
}

export enum DatasetSampleType {
  elasticsearch = 'elasticsearch_documentation',
}
