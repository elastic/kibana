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
  TIME_FIELD_NAME,
} from './constants';

type SetupFixtures = Pick<ScoutWorkerFixtures, 'esArchiver' | 'kbnClient'> & {
  apiServices: ScoutWorkerFixtures['apiServices'];
};

export const setupFarequoteDataVisualizerFixtures = async ({
  esArchiver,
  apiServices,
  kbnClient,
}: SetupFixtures): Promise<string> => {
  await esArchiver.loadIfNeeded(FAREQUOTE_ES_ARCHIVE);

  await kbnClient.uiSettings.update({ 'dateFormat:tz': 'UTC' });

  const { data } = await apiServices.dataViews.create({
    title: DATA_VIEW_TITLE,
    name: DATA_VIEW_TITLE,
    timeFieldName: TIME_FIELD_NAME,
    override: true,
  });

  await createFarequoteKuerySavedSearch(kbnClient, data.id);

  return data.id;
};

type TeardownFixtures = Pick<ScoutWorkerFixtures, 'kbnClient'> & {
  apiServices: ScoutWorkerFixtures['apiServices'];
};

export const teardownFarequoteDataVisualizerFixtures = async (
  { apiServices, kbnClient }: TeardownFixtures,
  dataViewId?: string
): Promise<void> => {
  await kbnClient.savedObjects.delete({
    type: 'search',
    id: FAREQUOTE_KUERY_SAVED_SEARCH_ID,
  });

  if (dataViewId) {
    await apiServices.dataViews.delete(dataViewId);
  }

  await kbnClient.uiSettings.unset('dateFormat:tz');
};
