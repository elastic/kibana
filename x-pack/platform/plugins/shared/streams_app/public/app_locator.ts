/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';

export const STREAMS_APP_LOCATOR = 'STREAMS_APP_LOCATOR';

export interface StreamsAppLocatorParams extends SerializableRecord {
  /**
   * Optionally set stream ID, if not given it will link to the listing page.
   */
  name?: string;
}

export type StreamsAppLocator = LocatorPublic<StreamsAppLocatorParams>;

export class StreamsAppLocatorDefinition implements LocatorDefinition<StreamsAppLocatorParams> {
  public readonly id = STREAMS_APP_LOCATOR;

  constructor() {}

  public readonly getLocation = async (params: StreamsAppLocatorParams) => {
    return {
      app: 'streams',
      path: params.name ? `/${params.name}` : '/',
      state: {},
    };
  };
}
