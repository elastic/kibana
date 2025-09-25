/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { ENRICHMENT_URL_STATE_KEY } from '../url_schema/common';
import type { EnrichmentUrlState } from '../url_schema/enrichment_url_schema';

export type StreamsAppLocatorParams = SerializableRecord &
  (
    | { [key: string]: never }
    | {
        name: string;
      }
    | {
        name: string;
        managementTab: 'processing';
        pageState: EnrichmentUrlState;
      }
    | {
        name: string;
        managementTab: string;
        pageState: never;
      }
  );

export type StreamsAppLocator = LocatorPublic<StreamsAppLocatorParams>;

export class StreamsAppLocatorDefinition implements LocatorDefinition<StreamsAppLocatorParams> {
  public readonly id = STREAMS_APP_LOCATOR_ID;

  constructor() {}

  public readonly getLocation = async (params: StreamsAppLocatorParams) => {
    let path = '/';

    if (params.name) {
      // Concat stream name
      path = `/${params.name}`;

      // Concat management tab
      if (params.managementTab) {
        path = `/${params.name}/management/${params.managementTab}`;

        // Concat page state
        if (params.pageState) {
          path = setStateToKbnUrl(
            ENRICHMENT_URL_STATE_KEY,
            params.pageState,
            { useHash: false, storeInHashQuery: false },
            path
          );
        }
      }
    }

    return {
      app: 'streams',
      path,
      state: {},
    };
  };
}
