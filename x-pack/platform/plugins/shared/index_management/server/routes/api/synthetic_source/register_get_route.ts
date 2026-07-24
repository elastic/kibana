/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING } from '../../../../common/constants';
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

interface ClusterSettings {
  persistent?: Record<string, unknown>;
  transient?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
}

const getSettingValue = (settings: Record<string, unknown> | undefined): unknown => {
  if (!settings) {
    return undefined;
  }

  if (SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING in settings) {
    return settings[SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING];
  }

  const xpackSettings = settings.xpack;
  if (typeof xpackSettings !== 'object' || xpackSettings === null) {
    return undefined;
  }

  const mappingSettings = (xpackSettings as Record<string, unknown>).mapping;
  if (typeof mappingSettings !== 'object' || mappingSettings === null) {
    return undefined;
  }

  return (mappingSettings as Record<string, unknown>).synthetic_source_fallback_to_stored_source;
};

export const getSyntheticSourceFallbackToStoredSource = ({
  persistent,
  transient,
  defaults,
}: ClusterSettings): boolean => {
  const value =
    getSettingValue(transient) ?? getSettingValue(persistent) ?? getSettingValue(defaults);

  return value === true || value === 'true';
};

export function registerGetRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/synthetic_source'),
      security: {
        authz: {
          enabled: false,
          reason: 'Uses internal es client to read cluster-level UI state',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const clusterSettings = (await client.asInternalUser.cluster.getSettings({
          flat_settings: true,
          include_defaults: true,
        })) as ClusterSettings;

        return response.ok({
          body: {
            syntheticSourceFallbackToStoredSource:
              getSyntheticSourceFallbackToStoredSource(clusterSettings),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
