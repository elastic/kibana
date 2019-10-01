/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

import { npStart } from 'ui/new_platform';

import { setup as data } from '../../../../../../../../src/legacy/core_plugins/data/public/legacy';

import { useAppDependencies } from '../../index';

import {
  createSearchItems,
  loadCurrentIndexPattern,
  loadIndexPatterns,
  loadCurrentSavedSearch,
} from './common';

import { KibanaContext, KibanaContextValue } from './kibana_context';

const { indexPatterns } = data.indexPatterns;
const savedObjectsClient = npStart.core.savedObjects.client;

interface Props {
  savedObjectId: string;
}

export const KibanaProvider: FC<Props> = ({ savedObjectId, children }) => {
  const appDeps = useAppDependencies();
  const savedSearches = appDeps.core.savedSearches.getClient();

  const [contextValue, setContextValue] = useState<KibanaContextValue>({ initialized: false });

  async function fetchSavedObject(id: string) {
    await loadIndexPatterns(savedObjectsClient, indexPatterns);

    let fetchedIndexPattern;
    let fetchedSavedSearch;

    try {
      fetchedIndexPattern = await loadCurrentIndexPattern(indexPatterns, id);
    } catch (e) {
      // Just let fetchedIndexPattern stay undefined in case it doesn't exist.
    }

    try {
      fetchedSavedSearch = await loadCurrentSavedSearch(savedSearches, id);
    } catch (e) {
      // Just let fetchedSavedSearch stay undefined in case it doesn't exist.
    }

    const kibanaConfig = npStart.core.uiSettings;

    const { indexPattern, savedSearch, combinedQuery } = createSearchItems(
      fetchedIndexPattern,
      fetchedSavedSearch,
      kibanaConfig
    );

    const kibanaContext = {
      combinedQuery,
      currentIndexPattern: indexPattern,
      currentSavedSearch: savedSearch,
      indexPatterns,
      initialized: true,
      kbnBaseUrl: npStart.core.injectedMetadata.getBasePath(),
      kibanaConfig,
    };

    setContextValue(kibanaContext);
  }

  useEffect(() => {
    fetchSavedObject(savedObjectId);
  }, [savedObjectId]);

  return <KibanaContext.Provider value={contextValue}>{children}</KibanaContext.Provider>;
};
