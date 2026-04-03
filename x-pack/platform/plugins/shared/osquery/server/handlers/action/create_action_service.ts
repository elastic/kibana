/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { Subscription } from 'rxjs';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { savedQuerySavedObjectType, packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { OsqueryActiveLicenses } from './validate_license';
import { validateLicense } from './validate_license';
import { createActionHandler } from './create_action_handler';
import { getInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { convertECSMappingToObject } from '../../routes/utils';

export interface CreateActionOptions {
  alertData?: ParsedTechnicalFields & { _index: string };
  space?: { id: string };
}

export interface ResolvedSavedQuery {
  savedObjectId: string;
  query: string;
  description?: string;
  ecsMapping?: Record<string, { field?: string; value?: string | string[] }>;
  platform?: string;
  timeout?: number;
}

export interface ResolvedPack {
  savedObjectId: string;
  name: string;
  description?: string;
  queries: Record<string, unknown>;
}

export const createActionService = (osqueryContext: OsqueryAppContext) => {
  let licenseSubscription: Subscription | null = null;
  const licenses: OsqueryActiveLicenses = { isActivePlatinumLicense: false };

  licenseSubscription = osqueryContext.licensing.license$.subscribe((license) => {
    licenses.isActivePlatinumLicense = license.isActive && license.hasAtLeast('platinum');
  });

  const logger = osqueryContext.logFactory.get('createActionService');

  const create = async (
    params: CreateLiveQueryRequestBodySchema,
    options?: CreateActionOptions
  ) => {
    const error = validateLicense(licenses);

    return createActionHandler(osqueryContext, params, {
      alertData: options?.alertData,
      space: options?.space,
      error,
    });
  };

  /**
   * Resolve a saved query by its human-readable name.
   * Returns the saved object ID, query SQL, ECS mapping, and other metadata.
   * Works for both prebuilt and user-created saved queries.
   */
  const resolveSavedQueryByName = async (
    name: string,
    spaceId?: string
  ): Promise<ResolvedSavedQuery> => {
    const [coreStart] = await osqueryContext.getStartServices();
    const soClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId);

    const result = await soClient.find({
      type: savedQuerySavedObjectType,
      filter: `${savedQuerySavedObjectType}.attributes.id: "${name}"`,
      perPage: 1,
    });

    if (!result.saved_objects.length) {
      throw new Error(`Saved query "${name}" not found`);
    }

    const so = result.saved_objects[0];
    const attrs = so.attributes as Record<string, unknown>;
    let ecsMapping = attrs.ecs_mapping as ResolvedSavedQuery['ecsMapping'];

    if (ecsMapping) {
      ecsMapping = convertECSMappingToObject(ecsMapping as unknown as Array<Record<string, unknown>>) as unknown as ResolvedSavedQuery['ecsMapping'];
    }

    return {
      savedObjectId: so.id,
      query: attrs.query as string,
      description: attrs.description as string | undefined,
      ecsMapping,
      platform: attrs.platform as string | undefined,
      timeout: attrs.timeout as number | undefined,
    };
  };

  /**
   * Resolve a pack by its human-readable name.
   * Returns the saved object ID and pack metadata.
   * Works for both prebuilt and user-created packs.
   */
  const resolvePackByName = async (
    name: string,
    spaceId?: string
  ): Promise<ResolvedPack> => {
    const [coreStart] = await osqueryContext.getStartServices();
    const soClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId);

    const result = await soClient.find({
      type: packSavedObjectType,
      filter: `${packSavedObjectType}.attributes.name: "${name}"`,
      perPage: 1,
    });

    if (!result.saved_objects.length) {
      throw new Error(`Pack "${name}" not found`);
    }

    const so = result.saved_objects[0];
    const attrs = so.attributes as Record<string, unknown>;

    return {
      savedObjectId: so.id,
      name: attrs.name as string,
      description: attrs.description as string | undefined,
      queries: (attrs.queries as Record<string, unknown>) ?? {},
    };
  };

  const stop = () => {
    if (licenseSubscription) {
      licenseSubscription.unsubscribe();
    }
  };

  return {
    create,
    resolveSavedQueryByName,
    resolvePackByName,
    stop,
    logger,
  };
};
