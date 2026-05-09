/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { getStreamsLocation } from '@kbn/streams-plugin/common';
import type { StreamsAppLocationParams } from '@kbn/streams-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { v4 as uuidv4 } from 'uuid';
import {
  CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX,
  ENRICHMENT_URL_STATE_KEY,
} from '../url_schema/common';
import type {
  CustomSamplesDataSource,
  EnrichmentUrlState,
} from '../url_schema/enrichment_url_schema';

export interface StreamsAppLocatorDefinitionParams
  extends SerializableRecord,
    Pick<StreamsAppLocationParams, 'name' | 'managementTab'> {
  pageState?: SerializableRecord & EnrichmentUrlState;
}

export type StreamsAppLocator = LocatorPublic<StreamsAppLocatorDefinitionParams>;

export class StreamsAppLocatorDefinition
  implements LocatorDefinition<StreamsAppLocatorDefinitionParams>
{
  public readonly id = STREAMS_APP_LOCATOR_ID;

  constructor() {}

  public readonly getLocation = async (params: StreamsAppLocatorDefinitionParams) => {
    const location = getStreamsLocation(params);
    let { path } = location;

    if (isEnrichmentPageState(params)) {
      const parsedDataSources = params.pageState.dataSources.map((dataSource) => {
        // For custom samples data source, we need to persist the documents in the browser local storage to retrieve them later.
        if (dataSource.type === 'custom-samples') {
          return parseAndPersistCustomSamplesDataSource(dataSource, params.name);
        }
        return dataSource;
      });

      path = setStateToKbnUrl(
        ENRICHMENT_URL_STATE_KEY,
        { ...params.pageState, dataSources: parsedDataSources },
        { useHash: false, storeInHashQuery: false },
        path
      );
    }

    return {
      app: location.app,
      path,
      state: {},
    };
  };
}

const parseAndPersistCustomSamplesDataSource = (
  dataSource: CustomSamplesDataSource,
  streamName: string
) => {
  const key =
    dataSource.storageKey ??
    `${CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX}${streamName}__${uuidv4()}`;
  sessionStorage.setItem(key, JSON.stringify(dataSource));
  return {
    name: dataSource.name,
    enabled: dataSource.enabled,
    type: dataSource.type,
    documents: [],
    storageKey: key,
  };
};

const isEnrichmentPageState = (
  params: StreamsAppLocatorDefinitionParams
): params is StreamsAppLocatorDefinitionParams & {
  pageState: EnrichmentUrlState;
  name: string;
} => {
  return (
    typeof params.name === 'string' &&
    params.name.length > 0 &&
    'pageState' in params &&
    typeof params.pageState === 'object' &&
    params.pageState !== null &&
    'v' in params.pageState
  );
};
