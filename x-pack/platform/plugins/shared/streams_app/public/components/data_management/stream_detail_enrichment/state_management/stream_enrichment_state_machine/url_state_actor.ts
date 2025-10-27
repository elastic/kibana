/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromCallback } from 'xstate5';
import { withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import type { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import { ENRICHMENT_URL_STATE_KEY, enrichmentUrlSchema } from '../../../../../../common/url_schema';
import type { StreamEnrichmentContextType, StreamEnrichmentServiceDependencies } from './types';
import { defaultEnrichmentUrlState, defaultRandomSamplesDataSource } from './utils';

export function createUrlInitializerActor({
  core,
  urlStateStorageContainer,
}: Pick<StreamEnrichmentServiceDependencies, 'core' | 'urlStateStorageContainer'>) {
  return fromCallback(({ sendBack }) => {
    const urlStateValues =
      urlStateStorageContainer.get<unknown>(ENRICHMENT_URL_STATE_KEY) ?? undefined;

    if (!urlStateValues) {
      return sendBack({
        type: 'url.initialized',
        urlState: defaultEnrichmentUrlState,
      });
    }

    const parsed = enrichmentUrlSchema.safeParse(urlStateValues);

    if (parsed.success) {
      // Normalize to v3 shape internally, preserving any append fields
      const normalized = normalizeUrlState(parsed.data);

      // Always add default random samples data source
      if (!hasDefaultRandomSamplesDataSource(normalized.dataSources)) {
        normalized.dataSources.push(defaultRandomSamplesDataSource);
      }

      sendBack({
        type: 'url.initialized',
        urlState: normalized,
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

function normalizeUrlState(state: EnrichmentUrlState): EnrichmentUrlState {
  if (state.v === 3) {
    return state;
  }
  if (state.v === 2) {
    return {
      v: 3,
      dataSources: state.dataSources,
      processorsToAppend: state.processorsToAppend,
    };
  }
  // v1
  return {
    v: 3,
    dataSources: state.dataSources,
  };
}

const hasDefaultRandomSamplesDataSource = (dataSources: EnrichmentDataSource[]) => {
  return dataSources.some((dataSource) => dataSource.type === 'random-samples');
};

export function createUrlSyncAction({
  urlStateStorageContainer,
}: Pick<StreamEnrichmentServiceDependencies, 'urlStateStorageContainer'>) {
  return ({ context }: { context: StreamEnrichmentContextType }) => {
    urlStateStorageContainer.set(ENRICHMENT_URL_STATE_KEY, context.urlState, {
      replace: true,
    });
  };
}
