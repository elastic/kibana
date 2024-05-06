/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HasParentApi,
  HasType,
  PublishesDataViews,
  PublishesPanelTitle,
  PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import {
  apiIsOfType,
  apiPublishesUnifiedSearch,
  apiPublishesPanelTitle,
} from '@kbn/presentation-publishing';
import type { ILayer } from '../classes/layers/layer';

export type MapApi = HasType<'map'> & {
  getLayerList: () => ILayer[];
} & PublishesDataViews &
  PublishesPanelTitle &
  PublishesUnifiedSearch &
  Partial<HasParentApi<unknown>>;

export const isMapApi = (api: unknown): api is MapApi => {
  return Boolean(
    api &&
      apiIsOfType(api, 'map') &&
      typeof (api as MapApi).getLayerList === 'function' &&
      apiPublishesPanelTitle(api) &&
      apiPublishesUnifiedSearch(api)
  );
};
