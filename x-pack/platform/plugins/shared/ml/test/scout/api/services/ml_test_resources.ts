/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, KbnClient, ScoutLogger } from '@kbn/scout';

export interface MlTestResourcesService {
  setKibanaTimeZoneToUTC: () => Promise<void>;
  resetKibanaTimeZone: () => Promise<void>;
  createDataViewIfNeeded: (
    title: string,
    timeFieldName?: string,
    space?: string
  ) => Promise<string>;
  deleteDataViewByTitle: (title: string, space?: string) => Promise<void>;
}

export const getMlTestResourcesService = ({
  kbnClient,
  log,
  dataViews,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  dataViews: ApiServicesFixture['dataViews'];
}): MlTestResourcesService => {
  return {
    async setKibanaTimeZoneToUTC() {
      log.debug('[mlTestResources] Setting timezone to UTC');
      await kbnClient.uiSettings.update({ 'dateFormat:tz': 'UTC' });
    },

    async resetKibanaTimeZone() {
      log.debug('[mlTestResources] Resetting timezone');
      await kbnClient.uiSettings.unset('dateFormat:tz');
    },

    async createDataViewIfNeeded(title, timeFieldName?, space?) {
      const { data } = await dataViews.create({
        title,
        ...(timeFieldName ? { timeFieldName } : {}),
        override: true,
        spaceId: space,
      });
      return data.id;
    },

    async deleteDataViewByTitle(title, space?) {
      await dataViews.deleteByTitle(title, space);
    },
  };
};
