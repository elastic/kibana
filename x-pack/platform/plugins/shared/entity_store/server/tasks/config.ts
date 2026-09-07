/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule, TaskRegisterDefinition } from '@kbn/task-manager-plugin/server';
import { EntityStoreTaskType } from './constants';

type TaskScheduleConfig = Omit<TaskRegisterDefinition, 'createTaskRunner'> &
  Partial<IntervalSchedule>;

export interface EntityStoreTaskConfig extends TaskScheduleConfig {
  type: string;
}

export const TasksConfig = {
  [EntityStoreTaskType.enum.extractEntity]: {
    title: 'Entity Store - Execute Entity Task',
    type: 'entity_store:v2:extract_entity_task',
    timeout: '59s',
    interval: '1m',
  },
  [EntityStoreTaskType.enum.entityMaintainer]: {
    title: 'Entity Store - Entity Maintainer Task',
    type: 'entity_store:v2:entity_maintainer_task',
  },
  [EntityStoreTaskType.enum.entityProvenanceMappingMigration]: {
    title: 'Entity Store - Entity Provenance Mapping Migration',
    type: 'entity_store:v2:entity_provenance_mapping_migration',
    timeout: '10m',
  },
  [EntityStoreTaskType.enum.historySnapshot]: {
    title: 'Entity Store - History Snapshot Task',
    type: 'entity_store:v2:history_snapshot_task',
    timeout: '30m',
  },
  [EntityStoreTaskType.enum.resilience]: {
    title: 'Entity Store - Resilience Task',
    type: 'entity_store:v2:resilience_task',
    timeout: '5m',
    interval: '1h',
  },
  [EntityStoreTaskType.enum.statusReport]: {
    title: 'Entity Store - Status Report Task',
    type: 'entity_store:v2:status_report_task',
    timeout: '5m',
    interval: '12h',
  },
  [EntityStoreTaskType.enum.legacySecurityAssetsMigration]: {
    title: 'Entity Store - Legacy Security Assets Migration',
    type: 'entity_store:v2:legacy_security_assets_migration',
    // Latest/metadata reindex can take a long time on large entity indices.
    timeout: '60m',
  },
} as const satisfies Record<EntityStoreTaskType, EntityStoreTaskConfig>;
