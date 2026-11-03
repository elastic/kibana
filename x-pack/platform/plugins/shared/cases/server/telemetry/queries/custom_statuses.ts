/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_SPACE_SETTINGS_SAVED_OBJECT } from '../../../common/constants';
import type { CasesSpaceSettings } from '../../../common/types/domain/space_settings/v1';
import type {
  CollectTelemetryDataParams,
  CustomStatusesCategoryTelemetry,
  CustomStatusesTelemetry,
} from '../types';

const emptyCategory = (): CustomStatusesCategoryTelemetry => ({ total: 0, max: 0 });

/**
 * Adoption of custom case statuses: how many spaces saved their own list, and how many statuses
 * those lists hold per category. Only counts are read; keys and labels are never reported. The
 * statuses are unmapped, so the documents (one per space) are read and counted here.
 */
export const getCustomStatusesTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<CustomStatusesTelemetry> => {
  const result: CustomStatusesTelemetry = {
    totalSpaces: 0,
    byCategory: {
      notStarted: emptyCategory(),
      active: emptyCategory(),
      done: emptyCategory(),
    },
  };

  const finder = savedObjectsClient.createPointInTimeFinder<CasesSpaceSettings>({
    type: CASES_SPACE_SETTINGS_SAVED_OBJECT,
    namespaces: ['*'],
    perPage: 1000,
  });

  try {
    for await (const { saved_objects: savedObjects } of finder.find()) {
      const spacesWithStatuses = savedObjects.filter(
        ({ attributes }) => (attributes.statuses ?? []).length > 0
      );

      for (const { attributes } of spacesWithStatuses) {
        const { statuses } = attributes;
        result.totalSpaces += 1;

        const counts = {
          notStarted: statuses.filter(({ category }) => category === 'not_started').length,
          active: statuses.filter(({ category }) => category === 'active').length,
          done: statuses.filter(({ category }) => category === 'done').length,
        };

        for (const category of ['notStarted', 'active', 'done'] as const) {
          result.byCategory[category].total += counts[category];
          result.byCategory[category].max = Math.max(
            result.byCategory[category].max,
            counts[category]
          );
        }
      }
    }
  } catch (error) {
    logger.error(`Cases custom statuses telemetry failed with error: ${error}`);
    throw error;
  } finally {
    await finder.close();
  }

  return result;
};
