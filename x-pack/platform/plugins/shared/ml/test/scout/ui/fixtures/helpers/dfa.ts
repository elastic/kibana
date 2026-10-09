/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ApiServicesFixture, EsClient } from '@kbn/scout';
import { ML_TEST_DASHBOARD_ATTRIBUTES } from '../constants';

interface CleanupDfaTestArgs {
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
  esClient: EsClient;
  jobId: string;
  dataViewId: string | undefined;
  dashboardId: string | undefined;
  destinationIndex: string;
}

/**
 * Creates the shared 'ML Test' dashboard saved object used in every DFA spec's beforeAll.
 * Returns the saved-object id so the caller can pass it to cleanupDfaTest.
 */
export const createMLTestDashboard = async (kbnClient: KbnClient): Promise<string> => {
  const dashboard = await kbnClient.savedObjects.create({
    type: 'dashboard',
    overwrite: false,
    attributes: ML_TEST_DASHBOARD_ATTRIBUTES,
  });
  return dashboard.id;
};

/**
 * Targeted cleanup for a DFA cloning test. Removes only the specific jobs and
 * indices created by a single test to avoid interfering with other tests.
 * All cleanup operations are attempted, while unexpected failures are surfaced.
 */
export const cleanupDfaCloningTest = async ({
  apiServices,
  esClient,
  originalJobId,
  cloneJobId,
  sourceDataViewId,
  originalDestIndex,
  cloneDestIndex,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  originalJobId: string;
  cloneJobId: string;
  sourceDataViewId: string | undefined;
  originalDestIndex: string;
  cloneDestIndex: string;
}): Promise<void> => {
  const deleteDestinationDataViews = async (): Promise<void> => {
    const allViews = await apiServices.dataViews.getAll();
    for (const indexTitle of [originalDestIndex, cloneDestIndex]) {
      const view = allViews.data.find((dataView) => dataView.title === indexTitle);
      if (view) {
        await apiServices.dataViews.delete(view.id);
      }
    }
  };

  const cleanupResults = await Promise.allSettled([
    apiServices.ml.dataFrameAnalytics.deleteIfExists(originalJobId),
    apiServices.ml.dataFrameAnalytics.deleteIfExists(cloneJobId),
    sourceDataViewId ? apiServices.dataViews.delete(sourceDataViewId) : Promise.resolve(),
    esClient.indices.delete({ index: originalDestIndex, ignore_unavailable: true }),
    esClient.indices.delete({ index: cloneDestIndex, ignore_unavailable: true }),
    deleteDestinationDataViews(),
  ]);
  const failures = cleanupResults
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Failed to clean up DFA cloning test resources');
  }
};

/**
 * Targeted cleanup for a DFA results view test. Expected absences (e.g. job 404)
 * are tolerated via helpers; unexpected failures are surfaced as AggregateError.
 */
export const cleanupDfaResultsTest = async ({
  apiServices,
  esClient,
  jobId,
  sourceDataViewId,
  destDataViewId,
  destIndex,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  jobId: string;
  sourceDataViewId: string | undefined;
  destDataViewId: string | undefined;
  destIndex: string;
}): Promise<void> => {
  const results = await Promise.allSettled([
    apiServices.ml.dataFrameAnalytics.deleteIfExists(jobId),
    sourceDataViewId ? apiServices.dataViews.delete(sourceDataViewId) : Promise.resolve(),
    destDataViewId ? apiServices.dataViews.delete(destDataViewId) : Promise.resolve(),
    esClient.indices.delete({ index: destIndex, ignore_unavailable: true }),
  ]);
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Failed to clean up DFA results test resources');
  }
};

/**
 * Tears down the state mutated by one DFA creation spec:
 * - the specific DFA job
 * - the per-spec source data view
 * - the per-spec ML Test dashboard
 * - the destination index created when the job ran
 * - the destination data view auto-created alongside the destination index
 */
export const cleanupDfaTest = async ({
  apiServices,
  kbnClient,
  esClient,
  jobId,
  dataViewId,
  dashboardId,
  destinationIndex,
}: CleanupDfaTestArgs): Promise<void> => {
  const deleteDestinationDataView = async (): Promise<void> => {
    const destViews = await apiServices.dataViews.getAll();
    const destView = destViews.data.find((view) => view.title === destinationIndex);
    if (destView) {
      await apiServices.dataViews.delete(destView.id);
    }
  };

  const cleanupResults = await Promise.allSettled([
    apiServices.ml.dataFrameAnalytics.deleteIfExists(jobId),
    dataViewId ? apiServices.dataViews.delete(dataViewId) : Promise.resolve(),
    dashboardId
      ? kbnClient.savedObjects.delete({ type: 'dashboard', id: dashboardId })
      : Promise.resolve(),
    esClient.indices.delete({ index: destinationIndex, ignore_unavailable: true }),
    deleteDestinationDataView(),
  ]);
  const failures = cleanupResults
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Failed to clean up DFA creation test resources');
  }
};
