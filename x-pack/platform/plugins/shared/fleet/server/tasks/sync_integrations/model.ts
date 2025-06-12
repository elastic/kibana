/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallSource } from '../../types';

export interface IntegrationsData {
  package_name: string;
  package_version: string;
  updated_at: string;
  install_status: string;
  install_source?: InstallSource;
}

export interface BaseCustomAssetsData {
  type: string;
  name: string;
  package_name: string;
  package_version: string;
  is_deleted?: boolean;
}
export interface CustomAssetsData extends BaseCustomAssetsData {
  deleted_at?: string;
  [key: string]: any;
}

export interface CustomAssetsError {
  timestamp: string;
  error: string;
}

export interface SyncIntegrationsData {
  remote_es_hosts: Array<{
    name: string;
    hosts: string[];
    sync_integrations: boolean;
    sync_uninstalled_integrations?: boolean;
  }>;
  integrations: IntegrationsData[];
  custom_assets: {
    [key: string]: CustomAssetsData;
  };
  custom_assets_error?: CustomAssetsError;
}
