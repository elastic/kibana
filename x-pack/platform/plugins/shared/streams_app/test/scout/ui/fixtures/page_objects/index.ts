/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageObjects, ScoutPage, createLazyPageObject } from '@kbn/scout';
import { StreamsApp } from './streams_app';

export interface StreamsPageObjects extends PageObjects {
  streams: StreamsApp;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): StreamsPageObjects {
  return {
    ...pageObjects,
    streams: createLazyPageObject(StreamsApp, page),
  };
}
