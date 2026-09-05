/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import { FF_ENTITY_PROVENANCE_ENABLED, FF_MIGRATE_LEGACY_SECURITY_ASSETS } from '../common';

export const featureFlags: FeatureFlagDefinitions = [
  {
    key: FF_ENTITY_PROVENANCE_ENABLED,
    name: 'Enable Entity Store entity provenance',
    description:
      'When enabled, Entity Store mappings are upgraded to include `entity.created_by` before logs extraction records and backfills entity provenance.',
    tags: ['entity-store', 'security-entity-analytics'],
    variationType: 'boolean',
    variations: [
      {
        name: 'Enabled',
        description: 'Upgrade mappings and record entity provenance',
        value: true,
      },
      {
        name: 'Disabled',
        description: 'Do not upgrade mappings or record entity provenance',
        value: false,
      },
    ],
  },
  {
    key: FF_MIGRATE_LEGACY_SECURITY_ASSETS,
    name: 'Migrate Entity Store legacy Security-scoped indices',
    description:
      'When enabled, existing `.entities.v2.*.security_{space}` assets may be migrated to solution-neutral names. Reads and writes stay on the old concrete index until that index is deleted. Keep this off until the upgrade path is verified on a large environment.',
    tags: ['entity-store', 'security-entity-analytics'],
    variationType: 'boolean',
    variations: [
      {
        name: 'Enabled',
        description: 'Legacy Security-scoped assets may be migrated',
        value: true,
      },
      {
        name: 'Disabled',
        description: 'Keep reads and writes on the old concrete indices',
        value: false,
      },
    ],
  },
];

export type {
  EntityStoreSetupContract,
  EntityStoreStartContract,
  EntityStoreCRUDClient,
} from './types';
export type { RegisterEntityMaintainerConfig } from './tasks/entity_maintainers/types';
export { EntityMaintainerTaskStatus } from './tasks/entity_maintainers/types';
export type {
  EntityUpdateClient,
  BulkObject,
  BulkObjectResponse,
  CreateEntityFromSourceRequest,
  CreateEntitiesFromSourceResult,
  CreateEntityFromSourceOutcome,
  EntityCreationRejectionReason,
  CreateEntityFromSourceRejectionReason,
} from './domain/crud';
export { isEntityTypeCreatableFromSingleDocument } from '../common/domain/definitions/creatable_from_single_document';
export type { EntityMetadataClient } from './domain/entity_metadata';
export type { RelationshipsClient } from './domain/relationships';
export type { ResolutionClient } from './domain/resolution';
export type { BulkDropTypeSummary } from './infra/elasticsearch/bulk_drop_aggregator';
export { formatBulkDropSummary } from './infra/elasticsearch/bulk_drop_aggregator';
export { getLatestEntitiesIndexName, getEntitiesAlias, ENTITY_LATEST } from '../common';
export { getHistorySnapshotIndexPattern } from './domain/asset_manager/history_snapshot_index';
export {
  resolveLatestEntitiesIndexName,
  resolveHistorySnapshotIndexPatterns,
} from './domain/asset_manager/resolve_entity_store_indices';
export { ENGINE_METADATA_TYPE_FIELD } from './domain/logs_extraction/query_builder_commons';
export { getFieldValue } from '../common/domain/euid/commons';
export { EngineDescriptorTypeName } from './domain/saved_objects/engine_descriptor/types';
export { EntityStoreGlobalStateTypeName } from './domain/saved_objects/global_state/types';
export { EntityStorePreferencesTypeName } from './domain/saved_objects/preferences/types';
export { enterpriseLicenseMiddleware } from './routes/middleware/enterprise_license';
export { checkEntityStoreIndexPrivileges } from './routes/apis/utils/check_and_format_privileges';
export { ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES } from './routes/constants';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { EntityStorePlugin } = await import('./plugin');
  return new EntityStorePlugin(initializerContext);
}
