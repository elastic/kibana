/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import {
  FAREQUOTE_SAVED_SEARCHES,
  FAREQUOTE_SAVED_SEARCH_SETS,
  buildDiscoverSessionAttributes,
  injectDataViewId,
  toDiscoverSessionCreateAttributes,
  type FarequoteSavedSearchKey,
  type FarequoteSavedSearchSpec,
} from './farequote_saved_searches';

const SEARCH_TYPE = 'search';

export interface MlTestResources {
  createDataViewIfNeeded: (
    title: string,
    timeFieldName?: string,
    space?: string
  ) => Promise<string>;
  deleteDataViewByTitle: (title: string, space?: string) => Promise<void>;
  createSavedSearchFarequoteKueryIfNeeded: (
    dataViewTitle?: string,
    space?: string
  ) => Promise<void>;
  createSavedSearchFarequoteLuceneIfNeeded: (
    dataViewTitle?: string,
    space?: string
  ) => Promise<void>;
  createSavedSearchFarequoteFilterAndLuceneIfNeeded: (
    dataViewTitle?: string,
    space?: string
  ) => Promise<void>;
  createSavedSearchFarequoteFilterAndKueryIfNeeded: (
    dataViewTitle?: string,
    space?: string
  ) => Promise<void>;
  deleteSavedSearches: (space?: string) => Promise<void>;
  setKibanaTimeZoneToUTC: (space?: string) => Promise<void>;
  resetKibanaTimeZone: (space?: string) => Promise<void>;
}

const withSpace = (path: string, space?: string) => (space ? `/s/${space}${path}` : path);

const getSavedObjectIdByTitle = async ({
  kbnClient,
  log,
  title,
  objectType,
  space,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  title: string;
  objectType: string;
  space?: string;
}): Promise<string | undefined> => {
  return measurePerformanceAsync(
    log,
    `mlTestResources.getSavedObjectIdByTitle(${title})`,
    async () => {
      const response = await kbnClient.savedObjects.find<{ title?: string }>({
        type: objectType,
        space,
      });

      return response.saved_objects.find((savedObject) => savedObject.attributes.title === title)
        ?.id;
    }
  );
};

const buildSavedSearchCreateBody = async ({
  apiServices,
  spec,
  dataViewTitle,
  space,
}: {
  apiServices: ApiServicesFixture;
  spec: FarequoteSavedSearchSpec;
  dataViewTitle: string;
  space?: string;
}) => {
  const dataViewId = await apiServices.dataViews
    .getIdByTitle(dataViewTitle, space)
    .catch(() => undefined);
  if (!dataViewId) {
    throw new Error(`Data view '${dataViewTitle}' must exist before creating saved searches.`);
  }

  const attributes = injectDataViewId(buildDiscoverSessionAttributes(spec), dataViewId);
  return {
    attributes: toDiscoverSessionCreateAttributes(attributes),
    references: [
      {
        id: dataViewId,
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  };
};

export const getMlTestResources = ({
  apiServices,
  kbnClient,
  log,
}: {
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
  log: ScoutLogger;
}): MlTestResources => {
  const createDataViewIfNeeded = async (
    title: string,
    timeFieldName?: string,
    space?: string
  ): Promise<string> => {
    return measurePerformanceAsync(
      log,
      `mlTestResources.createDataViewIfNeeded(${title})`,
      async () => {
        const { data: dataViews } = await apiServices.dataViews.getAll(space);
        const existing = dataViews.find((dataView) => dataView.title === title);
        if (existing?.id) {
          return existing.id;
        }

        const { data: created } = await apiServices.dataViews.create({
          title,
          timeFieldName,
          spaceId: space,
        });
        return created.id;
      }
    );
  };

  const deleteDataViewByTitle = async (title: string, space?: string) => {
    await measurePerformanceAsync(
      log,
      `mlTestResources.deleteDataViewByTitle(${title})`,
      async () => {
        await apiServices.dataViews.deleteByTitle(title, space);
      }
    );
  };

  const createSavedSearchIfNeeded = async (
    key: FarequoteSavedSearchKey,
    dataViewTitle: string,
    space?: string
  ) => {
    const spec = FAREQUOTE_SAVED_SEARCHES[key];
    const existingId = await getSavedObjectIdByTitle({
      kbnClient,
      log,
      title: spec.title,
      objectType: SEARCH_TYPE,
      space,
    });

    if (existingId) {
      return;
    }

    const body = await buildSavedSearchCreateBody({
      apiServices,
      spec,
      dataViewTitle,
      space,
    });

    await measurePerformanceAsync(
      log,
      `mlTestResources.createSavedSearch(${spec.title})`,
      async () => {
        // Use the public saved objects API: kbnClient.savedObjects.create always adds an
        // `overwrite` query param that querystring serializes as a string and the FTR SO
        // route rejects.
        await kbnClient.request({
          method: 'POST',
          path: withSpace(`/api/saved_objects/${SEARCH_TYPE}`, space),
          body: {
            attributes: body.attributes,
            references: body.references,
          },
        });
      }
    );
  };

  return {
    createDataViewIfNeeded,
    deleteDataViewByTitle,
    createSavedSearchFarequoteKueryIfNeeded: async (
      dataViewTitle = 'ft_farequote',
      space?: string
    ) => {
      await createSavedSearchIfNeeded('farequoteKuery', dataViewTitle, space);
    },
    createSavedSearchFarequoteLuceneIfNeeded: async (
      dataViewTitle = 'ft_farequote',
      space?: string
    ) => {
      await createSavedSearchIfNeeded('farequoteLucene', dataViewTitle, space);
    },
    createSavedSearchFarequoteFilterAndLuceneIfNeeded: async (
      dataViewTitle = 'ft_farequote',
      space?: string
    ) => {
      await createSavedSearchIfNeeded('farequoteFilterAndLucene', dataViewTitle, space);
    },
    createSavedSearchFarequoteFilterAndKueryIfNeeded: async (
      dataViewTitle = 'ft_farequote',
      space?: string
    ) => {
      await createSavedSearchIfNeeded('farequoteFilterAndKuery', dataViewTitle, space);
    },
    deleteSavedSearches: async (space?: string) => {
      await measurePerformanceAsync(log, 'mlTestResources.deleteSavedSearches', async () => {
        for (const key of FAREQUOTE_SAVED_SEARCH_SETS.dataVisualizerPlugin) {
          const { title } = FAREQUOTE_SAVED_SEARCHES[key];
          const id = await getSavedObjectIdByTitle({
            kbnClient,
            log,
            title,
            objectType: SEARCH_TYPE,
            space,
          });
          if (id) {
            await kbnClient.request({
              method: 'DELETE',
              path: withSpace(`/api/saved_objects/${SEARCH_TYPE}/${id}`, space),
            });
          }
        }
      });
    },
    setKibanaTimeZoneToUTC: async (space?: string) => {
      await kbnClient.uiSettings.update({ 'dateFormat:tz': 'UTC' }, { space });
    },
    resetKibanaTimeZone: async (space?: string) => {
      await kbnClient.uiSettings.unset('dateFormat:tz', { space });
    },
  };
};
