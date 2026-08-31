/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';
import {
  createFarequoteSavedSearches,
  deleteFarequoteSavedSearches,
  FAREQUOTE_ES_ARCHIVE,
  FAREQUOTE_INDEX,
  FAREQUOTE_SAVED_SEARCH_SETS,
  FAREQUOTE_SAVED_SEARCHES,
  IHP_OUTLIER_ES_ARCHIVE,
  IHP_OUTLIER_INDEX,
  TIME_FIELD_NAME,
  type FarequoteSavedSearchKey,
} from './farequote_saved_searches';

type SetupFixtures = Pick<ScoutWorkerFixtures, 'esArchiver' | 'kbnClient' | 'esClient'> & {
  apiServices: ScoutWorkerFixtures['apiServices'];
};

type TeardownFixtures = Pick<ScoutWorkerFixtures, 'kbnClient'> & {
  apiServices: ScoutWorkerFixtures['apiServices'];
};

const assertIndexHasDocs = async (
  esClient: ScoutWorkerFixtures['esClient'],
  indexName: string,
  archivePath: string
): Promise<void> => {
  const { count } = await esClient.count({ index: indexName });
  if (count === 0) {
    throw new Error(
      `Expected documents in index '${indexName}' after loading ${archivePath}, but count was 0`
    );
  }
};

const createAndVerifyDataView = async (
  apiServices: ScoutWorkerFixtures['apiServices'],
  {
    title,
    timeFieldName,
  }: {
    title: string;
    timeFieldName?: string;
  }
): Promise<string> => {
  const { data } = await apiServices.dataViews.create({
    title,
    name: title,
    ...(timeFieldName ? { timeFieldName } : {}),
    override: true,
  });

  if (!data?.id) {
    throw new Error(`Failed to create data view '${title}'`);
  }

  const { data: createdViews } = await apiServices.dataViews.find(
    (dv) => dv.title === title || dv.name === title
  );
  if (createdViews.length === 0) {
    throw new Error(`Data view '${title}' was created but is not returned by dataViews.find`);
  }

  return data.id;
};

const assertSavedSearchesExist = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  keys: readonly FarequoteSavedSearchKey[]
): Promise<void> => {
  const expectedTitles = keys.map((key) => FAREQUOTE_SAVED_SEARCHES[key].title);
  const searches = await kbnClient.savedObjects.find<{ title?: string }>({ type: 'search' });
  const missingTitles = expectedTitles.filter(
    (title) => !searches.saved_objects.some((so) => so.attributes.title === title)
  );
  if (missingTitles.length > 0) {
    throw new Error(
      `Discover session(s) missing after create: ${missingTitles.join(
        ', '
      )} — SavedObjectFinder will fail`
    );
  }
};

/**
 * Loads ft_farequote + Discover sessions used by ML Scout DV tests:
 * - ft_farequote_kuery (actions panel)
 * - ft_farequote_filter_and_kuery (data drift)
 */
export const setupFarequoteDataVisualizerFixtures = async ({
  esArchiver,
  apiServices,
  kbnClient,
  esClient,
}: SetupFixtures): Promise<string> => {
  await esArchiver.loadIfNeeded(FAREQUOTE_ES_ARCHIVE);
  await assertIndexHasDocs(esClient, FAREQUOTE_INDEX, FAREQUOTE_ES_ARCHIVE);

  await kbnClient.uiSettings.update({ 'dateFormat:tz': 'UTC' });

  const dataViewId = await createAndVerifyDataView(apiServices, {
    title: FAREQUOTE_INDEX,
    timeFieldName: TIME_FIELD_NAME,
  });

  const savedSearchKeys = FAREQUOTE_SAVED_SEARCH_SETS.dataVisualizer;
  await createFarequoteSavedSearches(kbnClient, dataViewId, savedSearchKeys);
  await assertSavedSearchesExist(kbnClient, savedSearchKeys);

  return dataViewId;
};

/**
 * Same source set as FTR / DV Scout data drift:
 * - ft_ihp_outlier (archive + data view, no time field)
 * - ft_farequote (archive + data view + ft_farequote_filter_and_kuery)
 */
export const setupDataDriftFixtures = async ({
  esArchiver,
  apiServices,
  kbnClient,
  esClient,
}: SetupFixtures): Promise<{ farequoteDataViewId: string; ihpOutlierDataViewId: string }> => {
  await esArchiver.loadIfNeeded(IHP_OUTLIER_ES_ARCHIVE);
  await assertIndexHasDocs(esClient, IHP_OUTLIER_INDEX, IHP_OUTLIER_ES_ARCHIVE);

  await esArchiver.loadIfNeeded(FAREQUOTE_ES_ARCHIVE);
  await assertIndexHasDocs(esClient, FAREQUOTE_INDEX, FAREQUOTE_ES_ARCHIVE);

  await kbnClient.uiSettings.update({ 'dateFormat:tz': 'UTC' });

  const ihpOutlierDataViewId = await createAndVerifyDataView(apiServices, {
    title: IHP_OUTLIER_INDEX,
  });

  const farequoteDataViewId = await createAndVerifyDataView(apiServices, {
    title: FAREQUOTE_INDEX,
    timeFieldName: TIME_FIELD_NAME,
  });

  const savedSearchKeys = FAREQUOTE_SAVED_SEARCH_SETS.dataDrift;
  await createFarequoteSavedSearches(kbnClient, farequoteDataViewId, savedSearchKeys);
  await assertSavedSearchesExist(kbnClient, savedSearchKeys);

  return { farequoteDataViewId, ihpOutlierDataViewId };
};

export const teardownFarequoteDataVisualizerFixtures = async (
  { apiServices, kbnClient }: TeardownFixtures,
  dataViewId?: string
): Promise<void> => {
  await deleteFarequoteSavedSearches(kbnClient, FAREQUOTE_SAVED_SEARCH_SETS.dataVisualizer);

  if (dataViewId) {
    try {
      await apiServices.dataViews.delete(dataViewId);
    } catch {
      // ignore missing data view on cleanup
    }
  }

  await kbnClient.uiSettings.unset('dateFormat:tz');
};

export const teardownDataDriftFixtures = async (
  { apiServices, kbnClient }: TeardownFixtures,
  {
    farequoteDataViewId,
    ihpOutlierDataViewId,
  }: {
    farequoteDataViewId?: string;
    ihpOutlierDataViewId?: string;
  } = {}
): Promise<void> => {
  await deleteFarequoteSavedSearches(kbnClient, FAREQUOTE_SAVED_SEARCH_SETS.dataDrift);

  for (const dataViewId of [farequoteDataViewId, ihpOutlierDataViewId]) {
    if (!dataViewId) {
      continue;
    }
    try {
      await apiServices.dataViews.delete(dataViewId);
    } catch {
      // ignore missing data view on cleanup
    }
  }

  await kbnClient.uiSettings.unset('dateFormat:tz');
};
