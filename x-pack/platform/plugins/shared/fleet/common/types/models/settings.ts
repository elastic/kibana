/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseSettings {
  has_seen_add_data_notice?: boolean;
  prerelease_integrations_enabled?: boolean;
  use_space_awareness_migration_status?: 'pending' | 'success' | 'error';
  use_space_awareness_migration_started_at?: string | null;
  preconfigured_fields?: Array<'fleet_server_hosts'>;
  secret_storage_requirements_met?: boolean;
  output_secret_storage_requirements_met?: boolean;
  action_secret_storage_requirements_met?: boolean;
  ssl_secret_storage_requirements_met?: boolean;
  download_source_auth_secret_storage_requirements_met?: boolean;
  delete_unenrolled_agents?: {
    enabled: boolean;
    is_preconfigured: boolean;
  };
  ilm_migration_status?: {
    logs?: 'success' | null;
    metrics?: 'success' | null;
    synthetics?: 'success' | null;
  };
  integration_knowledge_enabled?: boolean;
}

export interface Settings extends BaseSettings {
  id: string;
  version?: string;
}
