/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BaseCustomAssetsData } from '../../../server/tasks/sync_integrations/model';

export enum SyncStatus {
  SYNCHRONIZING = 'synchronizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface RemoteSyncedIntegrationsBase {
  id?: string;
  package_name: string;
  package_version: string;
}
export interface RemoteSyncedIntegrationsStatus extends RemoteSyncedIntegrationsBase {
  sync_status: SyncStatus;
  error?: string;
  updated_at?: string;
}
export interface RemoteSyncedCustomAssetsStatus extends BaseCustomAssetsData {
  sync_status: SyncStatus;
  error?: string;
}

export interface RemoteSyncedCustomAssetsRecord {
  [key: string]: RemoteSyncedCustomAssetsStatus;
}
