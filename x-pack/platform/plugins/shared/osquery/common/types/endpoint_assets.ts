/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Endpoint Asset Document Schema
 *
 * Written to: logs-osquery_manager.endpoint_assets-* (intermediate index)
 * Flows to: entities-generic-latest (via Entity Store)
 * Queried by: Endpoint Assets Page (filtered by entity.sub_type='endpoint')
 *
 * Based on schema-alignment-entity-store.md design document
 */

/**
 * Entity namespace - required for Entity Store integration
 */
export interface EndpointAssetEntity {
  id: string;
  name: string;
  type: 'host';
  sub_type: 'endpoint';
  source: 'osquery';
  risk?: {
    calculated_level?: 'Low' | 'Moderate' | 'High' | 'Critical';
    calculated_score?: number;
  };
}

/**
 * Asset namespace - compatible with Asset Inventory
 */
export interface EndpointAssetInfo {
  criticality?: 'low_impact' | 'medium_impact' | 'high_impact' | 'extreme_impact';
  platform: 'windows' | 'macos' | 'linux' | 'unknown';
  category: 'endpoint';
}

/**
 * ECS Host namespace - for correlation with other security data
 */
export interface EndpointAssetHost {
  id: string;
  name: string;
  hostname?: string;
  os: {
    name?: string;
    version?: string;
    platform?: string;
    family?: string;
    build?: string;
    kernel?: string;
  };
  architecture?: string;
  ip?: string[];
  mac?: string[];
}

/**
 * ECS Agent namespace
 */
export interface EndpointAssetAgent {
  id?: string;
  name?: string;
  type?: string;
  version?: string;
}

/**
 * Endpoint-specific lifecycle tracking
 */
export interface EndpointAssetLifecycle {
  first_seen: string;
  last_seen: string;
  last_updated?: string;
}

/**
 * Endpoint-specific hardware facts
 */
export interface EndpointAssetHardware {
  cpu?: string;
  cpu_cores?: number;
  memory_gb?: number;
  vendor?: string;
  model?: string;
}

/**
 * Network interface information
 */
export interface EndpointAssetNetworkInterface {
  name: string;
  mac?: string;
  ip?: string[];
}

/**
 * Endpoint-specific network facts
 */
export interface EndpointAssetNetwork {
  interfaces?: EndpointAssetNetworkInterface[];
  listening_ports_count?: number;
}

/**
 * Endpoint-specific software inventory summary
 */
export interface EndpointAssetSoftware {
  installed_count?: number;
  services_count?: number;
}

/**
 * Security posture checks summary
 */
export interface EndpointAssetPostureChecks {
  passed: number;
  failed: number;
  total: number;
}

/**
 * Endpoint-specific security posture
 */
export interface EndpointAssetPosture {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  disk_encryption: 'OK' | 'FAIL' | 'UNKNOWN';
  firewall_enabled: boolean;
  secure_boot: boolean;
  checks: EndpointAssetPostureChecks;
  failed_checks: string[];
}

/**
 * Endpoint-specific privilege analysis
 */
export interface EndpointAssetPrivileges {
  local_admins: string[];
  admin_count: number;
  root_users: string[];
  elevated_risk: boolean;
}

/**
 * Endpoint-specific drift detection
 */
export interface EndpointAssetDrift {
  last_change?: string;
  change_types: string[];
  recently_changed: boolean;
}

/**
 * Query metadata
 */
export interface EndpointAssetQueries {
  total_results?: number;
}

/**
 * Endpoint namespace - domain-specific data
 */
export interface EndpointAssetEndpoint {
  lifecycle: EndpointAssetLifecycle;
  hardware: EndpointAssetHardware;
  network: EndpointAssetNetwork;
  software: EndpointAssetSoftware;
  posture: EndpointAssetPosture;
  privileges: EndpointAssetPrivileges;
  drift: EndpointAssetDrift;
  queries?: EndpointAssetQueries;
}

/**
 * ECS Event namespace
 */
export interface EndpointAssetEvent {
  ingested?: string;
  kind?: 'state';
}

/**
 * Complete Endpoint Asset Document
 */
export interface EndpointAssetDocument {
  entity: EndpointAssetEntity;
  asset: EndpointAssetInfo;
  host: EndpointAssetHost;
  agent?: EndpointAssetAgent;
  endpoint: EndpointAssetEndpoint;
  event?: EndpointAssetEvent;
  '@timestamp': string;
}

/**
 * Field constants - Entity fields (compatible with Entity Store)
 */
export const ENTITY_FIELDS = {
  ID: 'entity.id',
  NAME: 'entity.name',
  TYPE: 'entity.type',
  SUB_TYPE: 'entity.sub_type',
  SOURCE: 'entity.source',
  RISK_LEVEL: 'entity.risk.calculated_level',
  RISK_SCORE: 'entity.risk.calculated_score',
} as const;

/**
 * Field constants - Asset fields (compatible with Asset Inventory)
 */
export const ASSET_FIELDS = {
  CRITICALITY: 'asset.criticality',
  PLATFORM: 'asset.platform',
  CATEGORY: 'asset.category',
} as const;

/**
 * Field constants - Endpoint-specific fields
 */
export const ENDPOINT_FIELDS = {
  POSTURE_SCORE: 'endpoint.posture.score',
  POSTURE_LEVEL: 'endpoint.posture.level',
  DISK_ENCRYPTION: 'endpoint.posture.disk_encryption',
  FIREWALL_ENABLED: 'endpoint.posture.firewall_enabled',
  SECURE_BOOT: 'endpoint.posture.secure_boot',
  ADMIN_COUNT: 'endpoint.privileges.admin_count',
  LOCAL_ADMINS: 'endpoint.privileges.local_admins',
  ELEVATED_RISK: 'endpoint.privileges.elevated_risk',
  RECENTLY_CHANGED: 'endpoint.drift.recently_changed',
  FIRST_SEEN: 'endpoint.lifecycle.first_seen',
  LAST_SEEN: 'endpoint.lifecycle.last_seen',
} as const;
