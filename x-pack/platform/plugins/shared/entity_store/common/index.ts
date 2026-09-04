/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lightweight `@kbn/entity-store/common` barrel (webpack `common` entry).
 * Keeps page-load size small: no euid / streamlang here — use `euid_helpers` or `loadEuidApi()`.
 *
 * Public API for the entity_store plugin. Exports only constants and types needed
 * on every load (including browser). For EUID translation helpers
 * (DSL/ESQL/Painless, entity types), use common/euid_helpers.
 *
 * @example
 * import { euid, type EntityType } from '@kbn/entity-store/common/euid_helpers';
 */

import { z } from '@kbn/zod/v4';

export const PLUGIN_ID = 'entityStore';
export const PLUGIN_NAME = 'Entity Store';

export const FF_ENABLE_ENTITY_STORE_V2 = 'securitySolution:entityStoreEnableV2';

/** Cloud feature flag: when true, legacy `.entities.v2.*.security_{ns}` assets may be migrated. */
export const FF_MIGRATE_LEGACY_SECURITY_ASSETS = 'entityStore.migrateLegacySecurityAssets';

export {
  ENTITY_STORE_SOURCE_INDICES_PRIVILEGES,
  ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
  ENTITY_STORE_CLUSTER_PRIVILEGES,
  ENGINE_DESCRIPTOR_TYPE_NAME,
  ENGINE_DESCRIPTOR_CREATE_PRIVILEGE,
} from './privileges';

export type EntityStoreStatus = z.infer<typeof EntityStoreStatus>;
export const EntityStoreStatus = z.enum([
  'not_installed',
  'installing',
  'running',
  'stopped',
  'error',
]);

export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v2: '2',
  },
} as const;

const PUBLIC_BASE_ROUTE = '/api/security/entity_store';
const INTERNAL_BASE_ROUTE = '/internal/security/entity_store';

export const ENTITY_STORE_ROUTES = {
  public: {
    INSTALL: `${PUBLIC_BASE_ROUTE}/install`,
    UPDATE: PUBLIC_BASE_ROUTE,
    UNINSTALL: `${PUBLIC_BASE_ROUTE}/uninstall`,
    STATUS: `${PUBLIC_BASE_ROUTE}/status`,
    START: `${PUBLIC_BASE_ROUTE}/start`,
    STOP: `${PUBLIC_BASE_ROUTE}/stop`,
    CRUD_CREATE: `${PUBLIC_BASE_ROUTE}/entities/{entityType}`,
    CRUD_UPDATE: `${PUBLIC_BASE_ROUTE}/entities/{entityType}`,
    CRUD_BULK_UPDATE: `${PUBLIC_BASE_ROUTE}/entities/bulk`,
    CRUD_GET: `${PUBLIC_BASE_ROUTE}/entities`,
    CRUD_DELETE: `${PUBLIC_BASE_ROUTE}/entities/`,
    RESOLUTION_LINK: `${PUBLIC_BASE_ROUTE}/resolution/link`,
    RESOLUTION_UNLINK: `${PUBLIC_BASE_ROUTE}/resolution/unlink`,
    RESOLUTION_GROUP: `${PUBLIC_BASE_ROUTE}/resolution/group`,
    RESOLUTION_RULES_LIST: `${PUBLIC_BASE_ROUTE}/resolution/rules`,
    RESOLUTION_RULES_ENABLE: `${PUBLIC_BASE_ROUTE}/resolution/rules/{id}/enable`,
    RESOLUTION_RULES_DISABLE: `${PUBLIC_BASE_ROUTE}/resolution/rules/{id}/disable`,
  },
  internal: {
    CHECK_PRIVILEGES: `${INTERNAL_BASE_ROUTE}/check_privileges`,
    FORCE_LOG_EXTRACTION: `${INTERNAL_BASE_ROUTE}/{entityType}/force_log_extraction`,
    FORCE_HISTORY_SNAPSHOT: `${INTERNAL_BASE_ROUTE}/force_history_snapshot`,
    ENTITY_MAINTAINERS_START: `${INTERNAL_BASE_ROUTE}/entity_maintainers/start/{id}`,
    ENTITY_MAINTAINERS_STOP: `${INTERNAL_BASE_ROUTE}/entity_maintainers/stop/{id}`,
    ENTITY_MAINTAINERS_RUN: `${INTERNAL_BASE_ROUTE}/entity_maintainers/run/{id}`,
    ENTITY_MAINTAINERS_GET: `${INTERNAL_BASE_ROUTE}/entity_maintainers`,
    ENTITY_MAINTAINERS_INIT: `${INTERNAL_BASE_ROUTE}/entity_maintainers/init`,
  },
} as const satisfies Record<string, Record<string, string>>;

export {
  EntityMaintainerTaskStatus,
  EntityMaintainerResponseItem,
  GetEntityMaintainersResponse,
} from './entity_maintainers';

export { RESOLUTION_RULE_IDS, RESOLUTION_RULE_KINDS } from './domain/resolution_rules/constants';
export type { ResolutionRuleId, ResolutionRuleKind } from './domain/resolution_rules/constants';

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
};

// Entity types (slim definitions; for EUID translation use common/euid_helpers)
// NOTE: kept as a local copy (not re-exported from entity_schema.ts) to avoid
// importing @kbn/streamlang in the browser bundle. Must be kept in sync with
// entity_schema.ts. The 89 perf.entity.NNN types are synthetic definitions used
// only for performance / scale testing; they are never installed by default.
export type EntityType = z.infer<typeof EntityType>;
export const EntityType = z.enum([
  'user',
  'host',
  'service',
  'generic',
  'k8s.pod',
  'k8s.container',
  'k8s.deployment',
  'k8s.replicaset',
  'k8s.namespace',
  'k8s.node',
  'k8s.daemonset',
  'perf.entity.001',
  'perf.entity.002',
  'perf.entity.003',
  'perf.entity.004',
  'perf.entity.005',
  'perf.entity.006',
  'perf.entity.007',
  'perf.entity.008',
  'perf.entity.009',
  'perf.entity.010',
  'perf.entity.011',
  'perf.entity.012',
  'perf.entity.013',
  'perf.entity.014',
  'perf.entity.015',
  'perf.entity.016',
  'perf.entity.017',
  'perf.entity.018',
  'perf.entity.019',
  'perf.entity.020',
  'perf.entity.021',
  'perf.entity.022',
  'perf.entity.023',
  'perf.entity.024',
  'perf.entity.025',
  'perf.entity.026',
  'perf.entity.027',
  'perf.entity.028',
  'perf.entity.029',
  'perf.entity.030',
  'perf.entity.031',
  'perf.entity.032',
  'perf.entity.033',
  'perf.entity.034',
  'perf.entity.035',
  'perf.entity.036',
  'perf.entity.037',
  'perf.entity.038',
  'perf.entity.039',
  'perf.entity.040',
  'perf.entity.041',
  'perf.entity.042',
  'perf.entity.043',
  'perf.entity.044',
  'perf.entity.045',
  'perf.entity.046',
  'perf.entity.047',
  'perf.entity.048',
  'perf.entity.049',
  'perf.entity.050',
  'perf.entity.051',
  'perf.entity.052',
  'perf.entity.053',
  'perf.entity.054',
  'perf.entity.055',
  'perf.entity.056',
  'perf.entity.057',
  'perf.entity.058',
  'perf.entity.059',
  'perf.entity.060',
  'perf.entity.061',
  'perf.entity.062',
  'perf.entity.063',
  'perf.entity.064',
  'perf.entity.065',
  'perf.entity.066',
  'perf.entity.067',
  'perf.entity.068',
  'perf.entity.069',
  'perf.entity.070',
  'perf.entity.071',
  'perf.entity.072',
  'perf.entity.073',
  'perf.entity.074',
  'perf.entity.075',
  'perf.entity.076',
  'perf.entity.077',
  'perf.entity.078',
  'perf.entity.079',
  'perf.entity.080',
  'perf.entity.081',
  'perf.entity.082',
  'perf.entity.083',
  'perf.entity.084',
  'perf.entity.085',
  'perf.entity.086',
  'perf.entity.087',
  'perf.entity.088',
  'perf.entity.089',
] as const);

export const ALL_ENTITY_TYPES = Object.values(EntityType.enum);

export type {
  Entity,
  HostEntity,
  UserEntity,
  ServiceEntity,
  GenericEntity,
  EntityField,
  EngineMetadata,
  Asset,
} from './domain/definitions/entity.gen';
export type {
  EntitySummaryHighlight,
  EntitySummaryStaleness,
  EntitySummaryStalenessSignal,
  EntitySummaryStalenessSnapshot,
  EntitySummaryStalenessEntitySnapshot,
  EntitySummaryStalenessReason,
  SaveEntityAiSummaryParams,
  SaveEntityAiSummarySummary,
  PersistedEntityAiSummary,
  GetPersistedAiSummaryResponse,
} from './domain/definitions/entity_summary_staleness';
// Entity AI summary runtime helpers (staleness detection, structural caps, request-length
// caps) intentionally live behind the `@kbn/entity-store/common/entity_summary` subpath, NOT
// this page-load barrel, so they only ship in the chunks that use them (lazy flyout / server)
// rather than on every page load. Only the erased-at-build-time types stay in the barrel.
export type {
  EntitySummaryContent,
  CappedEntitySummaryContent,
} from './domain/definitions/entity_summary_limits';

export interface IdentitySourceFields {
  /** Fields that participate in identity (EUID composition). */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated. */
  identitySourceFields: string[];
}

export type { NonEcsTimelineDataRow } from './domain/euid/non_ecs_timeline_data';
export type {
  AssetCriticalityLevel,
  EntityRiskLevels,
  EntityHealthSummary,
  EntityHealthLevels,
} from './domain/definitions/entity.gen';

export {
  ENTITY_LATEST,
  ENTITY_UPDATES,
  ENTITY_HISTORY,
  ENTITY_METADATA,
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  MAPPING_VERSION,
  getEntityIndexPattern,
  getLegacySecurityEntityIndexPattern,
  getEntitiesAlias,
  getLatestEntitiesIndexName,
  getLatestEntityIndexPattern,
  getLegacySecurityLatestEntitiesIndexName,
  getLegacySecurityLatestEntityIndexPattern,
  getEntityMetadataAlias,
  getMetadataEntityIndexPattern,
} from './domain/entity_index';

export type {
  EngineStatus,
  EngineDescriptor,
  EngineComponentResource,
  EngineComponentStatus,
  GetEntityStoreStatusResponse,
  InitEntityStoreResponse,
  InspectQuery,
  ListEntitiesResponse,
} from './api_types';

export {
  RELATIONSHIP_KINDS,
  normalizeRelationshipRecord,
} from './domain/entity_metadata/relationship_metadata';
export type {
  RelationshipKind,
  RelationshipMetadataDoc,
  RelationshipMetadataMaintainer,
} from './domain/entity_metadata/relationship_metadata';
export { AI_SUMMARY_EVENT_ACTION } from './domain/entity_metadata/ai_summary_metadata';
export type {
  AiSummaryMetadataDoc,
  AiSummaryHighlightItem,
  AiSummaryMetadataStaleness,
  AiSummaryMetadataStalenessSnapshot,
} from './domain/entity_metadata/ai_summary_metadata';
