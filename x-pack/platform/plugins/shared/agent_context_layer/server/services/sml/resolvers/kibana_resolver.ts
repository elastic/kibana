/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { SmlResolver, SmlResolverItem } from './types';

export const KIBANA_RESOLVER_TYPE = 'kibana';

/**
 * Split a Kibana resolver path of the form `<so_type>/<so_id>` into its
 * components. The saved-object id portion is treated as opaque (it may
 * contain `/` characters in custom SO id schemes), so only the FIRST `/`
 * acts as a separator.
 *
 * Throws when the path doesn't match the expected shape so callers see
 * a clear error early instead of silently mis-resolving a resource.
 */
export const parseKibanaResolverPath = (
  originPath: string
): { savedObjectType: string; savedObjectId: string } => {
  const sep = originPath.indexOf('/');
  if (sep <= 0 || sep === originPath.length - 1) {
    throw new Error(
      `Invalid kibana resolver path '${originPath}': expected '<saved_object_type>/<saved_object_id>'`
    );
  }
  return {
    savedObjectType: originPath.slice(0, sep),
    savedObjectId: originPath.slice(sep + 1),
  };
};

/**
 * Built-in resolver for Kibana saved objects.
 *
 * `origin_id` form: `kibana://<saved_object_type>/<saved_object_id>`.
 *
 * Permissions: a single Kibana privilege of the form `saved_object:<type>/get`
 * — the standard read privilege the SO API enforces. Stored without the
 * `kibana:` DSL prefix (bare string is treated as Kibana by the SML
 * security check).
 */
export const createKibanaResolver = (): SmlResolver => ({
  type: KIBANA_RESOLVER_TYPE,

  getPermissions: (originPath) => {
    const { savedObjectType } = parseKibanaResolverPath(originPath);
    return [`saved_object:${savedObjectType}/get`];
  },

  getItem: async (originPath, context): Promise<SmlResolverItem<SavedObject> | undefined> => {
    const { savedObjectType, savedObjectId } = parseKibanaResolverPath(originPath);
    try {
      const so = await context.savedObjectsClient.get(savedObjectType, savedObjectId);
      return { type: KIBANA_RESOLVER_TYPE, path: originPath, data: so };
    } catch (error) {
      // 404 and forbidden both surface as access failures from the caller's
      // perspective. Log and return undefined so the SML layer can present a
      // unified "denied or not found" outcome to the user without leaking
      // resource existence.
      context.logger.debug(
        `kibana resolver: failed to read saved object '${savedObjectType}/${savedObjectId}': ${
          (error as Error).message
        }`
      );
      return undefined;
    }
  },
});
