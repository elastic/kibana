/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, SavedObjectsClientContract } from '@kbn/core/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';

import { getInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import type { PackSavedObject } from '../common/types';
import { updateGlobalPacksCreateCallback } from './update_global_packs';
import { packSavedObjectType } from '../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContextService } from './osquery_app_context_services';

/**
 * Builds the Fleet `packagePolicyCreate` callback that attaches global Osquery
 * packs (shard `*`) to a newly created osquery_manager package policy.
 *
 * Both the pack lookup and the pack update MUST use the same space-scoped client.
 * Packs are `multiple-isolated` (a pack lives in exactly one space), so looking
 * packs up with a default-space client and then updating them with a client
 * scoped to the current (custom) space throws a 404 when a global pack exists in
 * another space (see https://github.com/elastic/kibana/issues/278436).
 */
export const getPackagePolicyCreateCallback =
  (
    core: CoreStart,
    osqueryContext: OsqueryAppContextService,
    initialize: () => Promise<void>,
    isRruleFeatureEnabled: boolean
  ) =>
  async (
    newPackagePolicy: NewPackagePolicy,
    soClient: SavedObjectsClientContract
  ): Promise<NewPackagePolicy> => {
    if (newPackagePolicy.package?.name !== OSQUERY_INTEGRATION_NAME) {
      return newPackagePolicy;
    }

    await initialize();

    const spaceId = soClient.getCurrentNamespace();
    const spaceScopedClient = getInternalSavedObjectsClientForSpaceId(core, spaceId);

    type PackSavedObjectAttributes = Omit<PackSavedObject, 'saved_object_id' | 'references'>;

    const data = await spaceScopedClient.find<PackSavedObjectAttributes>({
      type: packSavedObjectType,
    });

    const savedObjects: PackSavedObject[] = data.saved_objects.map((pack) => ({
      ...pack.attributes,
      saved_object_id: pack.id,
      references: pack.references,
    }));

    return updateGlobalPacksCreateCallback(
      newPackagePolicy,
      spaceScopedClient,
      savedObjects,
      osqueryContext,
      spaceId,
      isRruleFeatureEnabled
    );
  };
