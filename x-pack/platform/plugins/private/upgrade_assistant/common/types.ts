/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthReportImpact } from '@elastic/elasticsearch/lib/api/types';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { DataStreamsAction } from './data_stream_types';
export type {
  ReindexStatusResponse,
  IndexWarning,
  IndexWarningType,
} from '@kbn/upgrade-assistant-pkg-common';
export { ReindexStep, ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';

export * from './data_stream_types';

export type DeprecationSource = 'Kibana' | 'Elasticsearch';

export type ClusterUpgradeState = 'isPreparingForUpgrade' | 'isUpgrading' | 'isUpgradeComplete';

export interface ResponseError {
  statusCode: number;
  message: string | Error;
  attributes?: {
    allNodesUpgraded: boolean;
  };
}

// todo - move to package
export const REINDEX_OP_TYPE = 'upgrade-assistant-reindex-operation';

// Telemetry types
export type UIOpenOption = 'overview' | 'elasticsearch' | 'kibana';
export type UIReindexOption = 'close' | 'open' | 'start' | 'stop';

export interface UIOpen {
  overview: boolean;
  elasticsearch: boolean;
  kibana: boolean;
}

export interface UIReindex {
  close: boolean;
  open: boolean;
  start: boolean;
  stop: boolean;
}

export interface UpgradeAssistantTelemetry {
  features: {
    deprecation_logging: {
      enabled: boolean;
    };
  };
}

export type MIGRATION_DEPRECATION_LEVEL = 'none' | 'info' | 'warning' | 'critical';
export interface DeprecationInfo {
  level: MIGRATION_DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
  _meta?: {
    [key: string]: string;
  };
}

export interface IndexSettingsDeprecationInfo {
  [indexName: string]: DeprecationInfo[];
}

export interface IndexMetadata {
  isFrozenIndex: boolean;
  isInDataStream: boolean;
  isClosedIndex: boolean;
}

export interface IndexAction {
  /**
   * Includes relevant information about the index related to this action
   */
  metadata: IndexMetadata;
}

export interface ReindexAction extends IndexAction {
  type: 'reindex';

  /**
   * The transform IDs that are currently targeting this index
   */
  transformIds?: string[];

  /**
   * The actions that should be excluded from the reindex corrective action.
   */
  excludedActions?: string[];

  /**
   * The size of the index in bytes
   */
  indexSizeInBytes?: number;
}

export interface UnfreezeAction extends IndexAction {
  type: 'unfreeze';
}

export interface MlAction {
  type: 'mlSnapshot';
  snapshotId: string;
  jobId: string;
}

export interface IndexSettingAction {
  type: 'indexSetting';
  deprecatedSettings: string[];
}

export interface ClusterSettingAction {
  type: 'clusterSetting';
  deprecatedSettings: string[];
}

export interface HealthIndicatorAction {
  type: 'healthIndicator';
  cause: string;
  action: string;
  impacts: HealthReportImpact[];
}

export type CorrectiveAction =
  | ReindexAction
  | UnfreezeAction
  | MlAction
  | IndexSettingAction
  | ClusterSettingAction
  | DataStreamsAction
  | HealthIndicatorAction;

export interface EnrichedDeprecationInfo
  extends Omit<
    estypes.MigrationDeprecationsDeprecation,
    'level' | 'resolve_during_rolling_upgrade'
  > {
  type: keyof estypes.MigrationDeprecationsResponse | 'health_indicator';
  level: MIGRATION_DEPRECATION_LEVEL;
  status?: estypes.HealthReportIndicatorHealthStatus;
  index?: string;
  correctiveAction?: CorrectiveAction;
  resolveDuringUpgrade: boolean;
}

export interface CloudBackupStatus {
  isBackedUp: boolean;
  lastBackupTime?: string;
}

export interface ESUpgradeStatus {
  totalCriticalDeprecations: number;
  migrationsDeprecations: EnrichedDeprecationInfo[];
  totalCriticalHealthIssues: number;
  enrichedHealthIndicators: EnrichedDeprecationInfo[];
}

/* moved
export interface ResolveIndexResponseFromES {
  indices: Array<{
    name: string;
    // per https://github.com/elastic/elasticsearch/pull/57626
    attributes: Array<'open' | 'closed' | 'hidden' | 'frozen'>;
    aliases?: string[];
    data_stream?: string;
  }>;
  aliases: Array<{
    name: string;
    indices: string[];
  }>;
  data_streams: Array<{ name: string; backing_indices: string[]; timestamp_field: string }>;
}
  */

export const ML_UPGRADE_OP_TYPE = 'upgrade-assistant-ml-upgrade-operation';

export interface MlOperation {
  nodeId: string;
  snapshotId: string;
  jobId: string;
}

export interface DeprecationLoggingStatus {
  isDeprecationLogIndexingEnabled: boolean;
  isDeprecationLoggingEnabled: boolean;
}

export interface EsDeprecationLog {
  // Define expected properties from the logs
  '@timestamp'?: string;
  message?: string;
  [key: string]: any; // Allow for any additional ES log properties
}

export interface StatusResponseBody {
  readyForUpgrade: boolean;
  details: string;
  recentEsDeprecationLogs?: {
    count: number;
    logs: EsDeprecationLog[];
  };
  kibanaApiDeprecations?: any[]; // Uses DomainDeprecationDetails type from Kibana core
}

export type MIGRATION_STATUS = 'MIGRATION_NEEDED' | 'NO_MIGRATION_NEEDED' | 'IN_PROGRESS' | 'ERROR';
export interface SystemIndicesMigrationFeature {
  id?: string;
  feature_name: string;
  minimum_index_version: string;
  migration_status: MIGRATION_STATUS;
  indices: Array<{
    index: string;
    version?: string;
    migration_status?: MIGRATION_STATUS;
    failure_cause?: {
      error: {
        type: string;
        reason: string;
      };
    };
  }>;
}
export interface SystemIndicesMigrationStatus {
  features: SystemIndicesMigrationFeature[];
  migration_status: MIGRATION_STATUS;
}
export interface SystemIndicesMigrationStarted {
  features: SystemIndicesMigrationFeature[];
  accepted: boolean;
}

export interface FeatureSet {
  migrateSystemIndices: boolean;
  mlSnapshots: boolean;
  reindexCorrectiveActions: boolean;
  migrateDataStreams: boolean;
}

export type DataSourceExclusions = Record<string, Array<'readOnly' | 'reindex'>>;
export type DataSourceAutoResolution = Record<string, 'readOnly'>;

export type IndicesResolutionType = 'readonly' | 'reindex' | 'unfreeze';
