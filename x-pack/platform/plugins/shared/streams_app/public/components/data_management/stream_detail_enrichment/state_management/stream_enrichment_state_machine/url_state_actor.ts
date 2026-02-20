/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromCallback } from 'xstate';
import type { ActionArgs } from 'xstate';
import { withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX } from '../../../../../../common/url_schema/common';
import type {
  CustomSamplesDataSource,
  EnrichmentDataSource,
  EnrichmentUrlState,
} from '../../../../../../common/url_schema';
import { ENRICHMENT_URL_STATE_KEY, enrichmentUrlSchema } from '../../../../../../common/url_schema';
import { defaultEnrichmentUrlState, defaultLatestSamplesDataSource } from './utils';
import type {
  StreamEnrichmentContextType,
  StreamEnrichmentEvent,
  StreamEnrichmentServiceDependencies,
} from './types';

export function createUrlInitializerActor({
  core,
  urlStateStorageContainer,
}: Pick<StreamEnrichmentServiceDependencies, 'core' | 'urlStateStorageContainer'>) {
  return fromCallback(({ sendBack }) => {
    const urlStateValues =
      urlStateStorageContainer.get<EnrichmentUrlState>(ENRICHMENT_URL_STATE_KEY) ?? undefined;

    const persistedCustomSamplesSources = retrievePersistedCustomSamplesSources();

    if (!urlStateValues) {
      return sendBack({
        type: 'url.initialized',
        urlState: {
          ...defaultEnrichmentUrlState,
          dataSources: getDataSourcesWithDefault(
            Object.values(persistedCustomSamplesSources) // Add new custom samples data sources not existing in the url state
          ),
        },
      });
    }

    const urlState = enrichmentUrlSchema.safeParse(urlStateValues);

    if (urlState.success) {
      // Restore persisted custom samples documents for existing custom samples data sources
      urlState.data.dataSources.forEach((source) => {
        if (
          source.type === 'custom-samples' &&
          source.storageKey &&
          source.storageKey in persistedCustomSamplesSources
        ) {
          source.documents = persistedCustomSamplesSources[source.storageKey].documents;
          delete persistedCustomSamplesSources[source.storageKey];
        }
      });

      // Add new custom samples data sources not existing in the url state
      Object.keys(persistedCustomSamplesSources).forEach((key) => {
        urlState.data.dataSources.push(persistedCustomSamplesSources[key]);
      });

      // Always add default latest samples data source
      if (!hasDefaultLatestSamplesDataSource(urlState.data.dataSources)) {
        const dataSourcesWithDefault = getDataSourcesWithDefault(urlState.data.dataSources);

        urlState.data.dataSources = dataSourcesWithDefault;
      }

      sendBack({
        type: 'url.initialized',
        urlState: urlState.data,
      });
    } else {
      withNotifyOnErrors(core.notifications.toasts).onGetError(
        new Error('The default state will be used as fallback.')
      );
      sendBack({
        type: 'url.initialized',
        urlState: defaultEnrichmentUrlState,
      });
    }
  });
}

const hasDefaultLatestSamplesDataSource = (dataSources: EnrichmentDataSource[]) => {
  return dataSources.some((dataSource) => dataSource.type === 'latest-samples');
};

const getDataSourcesWithDefault = (dataSources: EnrichmentDataSource[]) => {
  const isLatestSamplesDataSourceEnabled = dataSources.every((dataSource) => !dataSource.enabled);

  dataSources.unshift({
    ...defaultLatestSamplesDataSource,
    enabled: isLatestSamplesDataSourceEnabled,
  });

  return dataSources;
};

const retrievePersistedCustomSamplesSources = () => {
  const storedSourcesKeys = Object.keys(sessionStorage).filter((key) =>
    key.startsWith(CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX)
  );

  const sources: Record<string, CustomSamplesDataSource> = {};

  storedSourcesKeys.forEach((key) => {
    const dataSource = sessionStorage.getItem(key);
    if (dataSource) {
      const parsedDataSource = JSON.parse(dataSource);
      parsedDataSource.enabled = false;
      sources[key] = { ...parsedDataSource, documents: [] };
    }
  });

  return sources;
};

export function createUrlSyncAction({
  urlStateStorageContainer,
}: Pick<StreamEnrichmentServiceDependencies, 'urlStateStorageContainer'>) {
  return ({
    context,
  }: ActionArgs<StreamEnrichmentContextType, StreamEnrichmentEvent, StreamEnrichmentEvent>) => {
    urlStateStorageContainer.set(ENRICHMENT_URL_STATE_KEY, context.urlState, {
      replace: true,
    });
  };
}
