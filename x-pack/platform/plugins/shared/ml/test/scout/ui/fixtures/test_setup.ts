/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';
import {
  createFarequoteKuerySavedSearch,
  DATA_VIEW_TITLE,
  FAREQUOTE_ES_ARCHIVE,
  FAREQUOTE_KUERY_SAVED_SEARCH_ID,
  SAVED_SEARCH_TITLE,
  TIME_FIELD_NAME,
} from './constants';

type SetupFixtures = Pick<ScoutWorkerFixtures, 'esArchiver' | 'kbnClient' | 'esClient'> & {
  apiServices: ScoutWorkerFixtures['apiServices'];
};

export const setupFarequoteDataVisualizerFixtures = async ({
  esArchiver,
  apiServices,
  kbnClient,
  esClient,
}: SetupFixtures): Promise<string> => {
  await esArchiver.loadIfNeeded(FAREQUOTE_ES_ARCHIVE);

  const { count } = await esClient.count({ index: DATA_VIEW_TITLE });
  if (count === 0) {
    throw new Error(
      `Expected documents in index '${DATA_VIEW_TITLE}' after loading ${FAREQUOTE_ES_ARCHIVE}, but count was 0`
    );
  }

  await kbnClient.uiSettings.update({ 'dateFormat:tz': 'UTC' });

  const { data } = await apiServices.dataViews.create({
    title: DATA_VIEW_TITLE,
    name: DATA_VIEW_TITLE,
    timeFieldName: TIME_FIELD_NAME,
    override: true,
  });

  if (!data?.id) {
    throw new Error(`Failed to create data view '${DATA_VIEW_TITLE}'`);
  }

  await createFarequoteKuerySavedSearch(kbnClient, data.id);

  // Fail fast if the Discover session was not persisted (e.g. missing `tabs` rejected by schema)
  await kbnClient.savedObjects.get({
    type: 'search',
    id: FAREQUOTE_KUERY_SAVED_SEARCH_ID,
  });

  const { data: createdViews } = await apiServices.dataViews.find(
    (dv) => dv.title === DATA_VIEW_TITLE || dv.name === DATA_VIEW_TITLE
  );
  if (createdViews.length === 0) {
    throw new Error(
      `Data view '${DATA_VIEW_TITLE}' was created but is not returned by dataViews.find`
    );
  }

  const searches = await kbnClient.savedObjects.find<{ title?: string }>({ type: 'search' });
  const savedSearch = searches.saved_objects.find(
    (so) => so.attributes.title === SAVED_SEARCH_TITLE || so.id === FAREQUOTE_KUERY_SAVED_SEARCH_ID
  );
  if (!savedSearch) {
    throw new Error(
      `Discover session '${SAVED_SEARCH_TITLE}' was not found after create — SavedObjectFinder will fail`
    );
  }

  return data.id;
};

type TeardownFixtures = Pick<ScoutWorkerFixtures, 'kbnClient'> & {
  apiServices: ScoutWorkerFixtures['apiServices'];
};

export const teardownFarequoteDataVisualizerFixtures = async (
  { apiServices, kbnClient }: TeardownFixtures,
  dataViewId?: string
): Promise<void> => {
  try {
    await kbnClient.savedObjects.delete({
      type: 'search',
      id: FAREQUOTE_KUERY_SAVED_SEARCH_ID,
    });
  } catch {
    // ignore missing SO on cleanup
  }

  if (dataViewId) {
    await apiServices.dataViews.delete(dataViewId);
  }

  await kbnClient.uiSettings.unset('dateFormat:tz');
};
