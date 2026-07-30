/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, ScoutWorkerFixtures } from '@kbn/scout';

export const DATA_VIEW_ID_PLACEHOLDER = 'INDEX_PATTERN_ID_PLACEHOLDER';

export const FAREQUOTE_ES_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/ml/farequote';
export const IHP_OUTLIER_ES_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/ml/ihp_outlier';

export const FAREQUOTE_INDEX = 'ft_farequote';
export const IHP_OUTLIER_INDEX = 'ft_ihp_outlier';
export const TIME_FIELD_NAME = '@timestamp';

type QueryLanguage = 'kuery' | 'lucene';

interface SearchSourceFilter {
  meta: Record<string, unknown>;
  query: Record<string, unknown>;
  $state: { store: string };
}

export interface FarequoteSavedSearchSpec {
  title: string;
  query: { query: string; language: QueryLanguage };
  filters?: SearchSourceFilter[];
}

const airlineAsaFilter: SearchSourceFilter = {
  meta: {
    index: DATA_VIEW_ID_PLACEHOLDER,
    negate: false,
    disabled: false,
    alias: null,
    type: 'phrase',
    key: 'airline',
    value: 'ASA',
    params: { query: 'ASA', type: 'phrase' },
  },
  query: {
    match: {
      airline: { query: 'ASA', type: 'phrase' },
    },
  },
  $state: { store: 'appState' },
};

/**
 * Discover sessions used by ML Scout UI tests.
 * Titles match FTR / data_visualizer Scout so SavedObjectFinder selection stays stable.
 */
export const FAREQUOTE_SAVED_SEARCHES = {
  /** Used by index_data_visualizer_actions_panel_* specs */
  farequoteKuery: {
    title: 'ft_farequote_kuery',
    query: { query: 'airline: A* and responsetime > 5', language: 'kuery' },
  },
  /** Used by index_data_visualizer farequote lucene saved search specs */
  farequoteLucene: {
    title: 'ft_farequote_lucene',
    query: { query: 'airline:A*', language: 'lucene' },
  },
  /** Used by data drift (FTR + DV Scout) with ft_farequote */
  farequoteFilterAndKuery: {
    title: 'ft_farequote_filter_and_kuery',
    query: { query: 'responsetime > 49', language: 'kuery' },
    filters: [airlineAsaFilter],
  },
  /** Used by index_data_visualizer filters / dashboard field stats specs */
  farequoteFilterAndLucene: {
    title: 'ft_farequote_filter_and_lucene',
    query: { query: 'responsetime:>50', language: 'lucene' },
    filters: [airlineAsaFilter],
  },
} as const satisfies Record<string, FarequoteSavedSearchSpec>;

export type FarequoteSavedSearchKey = keyof typeof FAREQUOTE_SAVED_SEARCHES;

/** Sets aligned to the suites that currently use these fixtures. */
export const FAREQUOTE_SAVED_SEARCH_SETS = {
  /** actions-panel specs select ft_farequote_kuery */
  actionsPanel: ['farequoteKuery'] as const satisfies readonly FarequoteSavedSearchKey[],
  /** data drift loads ft_farequote_filter_and_kuery */
  dataDrift: ['farequoteFilterAndKuery'] as const satisfies readonly FarequoteSavedSearchKey[],
  /** both sources needed across ML Scout DV + data-drift parity */
  dataVisualizer: [
    'farequoteKuery',
    'farequoteFilterAndKuery',
  ] as const satisfies readonly FarequoteSavedSearchKey[],
  /** Full set used by data_visualizer plugin Scout helpers */
  dataVisualizerPlugin: [
    'farequoteKuery',
    'farequoteLucene',
    'farequoteFilterAndKuery',
    'farequoteFilterAndLucene',
  ] as const satisfies readonly FarequoteSavedSearchKey[],
};

export const FAREQUOTE_KUERY_SAVED_SEARCH_ID = 'scout-ft-farequote-kuery';
export const SAVED_SEARCH_TITLE = 'ft_farequote_kuery';

export const savedSearchIdForTitle = (title: string): string => `scout-${title.replace(/_/g, '-')}`;

/** Replace placeholder in nested JSON strings (e.g. searchSourceJSON) and plain fields. */
export const injectDataViewId = <T>(value: T, dataViewId: string): T =>
  JSON.parse(JSON.stringify(value).split(DATA_VIEW_ID_PLACEHOLDER).join(dataViewId)) as T;

/**
 * Discover model version 13 create schema only allows title/description/tabs.
 * Legacy top-level columns/sort/kibanaSavedObjectMeta must not be sent on create.
 */
export const toDiscoverSessionCreateAttributes = (attributes: {
  title: string;
  description?: string;
  tabs: unknown;
}): { title: string; description: string; tabs: unknown } => ({
  title: attributes.title,
  description: attributes.description ?? '',
  tabs: attributes.tabs,
});

const buildSearchSourceJSON = (spec: FarequoteSavedSearchSpec): string =>
  JSON.stringify({
    highlightAll: true,
    version: true,
    query: spec.query,
    filter: spec.filters ?? [],
    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
  });

export const buildDiscoverSessionAttributes = (spec: FarequoteSavedSearchSpec) => {
  const searchSourceJSON = buildSearchSourceJSON(spec);
  return {
    title: spec.title,
    description: '',
    tabs: [
      {
        id: 'tab_0',
        label: 'My Tab',
        attributes: {
          columns: ['_source'],
          sort: ['@timestamp', 'desc'],
          kibanaSavedObjectMeta: { searchSourceJSON },
        },
      },
    ],
  };
};

const getSavedSearchIdByTitle = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  title: string
): Promise<string | undefined> => {
  const response = await kbnClient.savedObjects.find<{ title?: string }>({ type: 'search' });
  return response.saved_objects.find((so) => so.attributes.title === title)?.id;
};

export const createFarequoteSavedSearch = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  dataViewId: string,
  spec: FarequoteSavedSearchSpec
): Promise<void> => {
  const attributes = injectDataViewId(buildDiscoverSessionAttributes(spec), dataViewId);

  await kbnClient.savedObjects.create({
    type: 'search',
    id: savedSearchIdForTitle(spec.title),
    overwrite: true,
    attributes: toDiscoverSessionCreateAttributes(attributes),
    references: [
      {
        id: dataViewId,
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  });
};

export const createFarequoteSavedSearchIfNeeded = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  apiServices: ApiServicesFixture,
  spec: FarequoteSavedSearchSpec,
  dataViewTitle: string = FAREQUOTE_INDEX
): Promise<void> => {
  const existingId = await getSavedSearchIdByTitle(kbnClient, spec.title);
  if (existingId) {
    return;
  }

  const dataViewId = await apiServices.dataViews.getIdByTitle(dataViewTitle);
  await createFarequoteSavedSearch(kbnClient, dataViewId, spec);
};

export const createFarequoteSavedSearches = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  dataViewId: string,
  keys: readonly FarequoteSavedSearchKey[] = FAREQUOTE_SAVED_SEARCH_SETS.dataVisualizer
): Promise<void> => {
  for (const key of keys) {
    await createFarequoteSavedSearch(kbnClient, dataViewId, FAREQUOTE_SAVED_SEARCHES[key]);
  }
};

export const createFarequoteKuerySavedSearch = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  dataViewId: string
): Promise<void> => {
  await createFarequoteSavedSearch(kbnClient, dataViewId, FAREQUOTE_SAVED_SEARCHES.farequoteKuery);
};

export const createSavedSearchFarequoteKueryIfNeeded = (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  apiServices: ApiServicesFixture,
  dataViewTitle: string = FAREQUOTE_INDEX
): Promise<void> =>
  createFarequoteSavedSearchIfNeeded(
    kbnClient,
    apiServices,
    FAREQUOTE_SAVED_SEARCHES.farequoteKuery,
    dataViewTitle
  );

export const createSavedSearchFarequoteFilterAndKueryIfNeeded = (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  apiServices: ApiServicesFixture,
  dataViewTitle: string = FAREQUOTE_INDEX
): Promise<void> =>
  createFarequoteSavedSearchIfNeeded(
    kbnClient,
    apiServices,
    FAREQUOTE_SAVED_SEARCHES.farequoteFilterAndKuery,
    dataViewTitle
  );

export const deleteFarequoteSavedSearches = async (
  kbnClient: ScoutWorkerFixtures['kbnClient'],
  keys: readonly FarequoteSavedSearchKey[] = FAREQUOTE_SAVED_SEARCH_SETS.dataVisualizer
): Promise<void> => {
  for (const key of keys) {
    const { title } = FAREQUOTE_SAVED_SEARCHES[key];
    const id = (await getSavedSearchIdByTitle(kbnClient, title)) ?? savedSearchIdForTitle(title);
    try {
      await kbnClient.savedObjects.delete({ type: 'search', id });
    } catch {
      // ignore missing SO on cleanup
    }
  }
};

export const deleteAllFarequoteSavedSearches = async (
  kbnClient: ScoutWorkerFixtures['kbnClient']
): Promise<void> => {
  await deleteFarequoteSavedSearches(kbnClient, FAREQUOTE_SAVED_SEARCH_SETS.dataVisualizer);
};
