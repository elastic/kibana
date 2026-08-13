/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { DocViewer } from '@kbn/unified-doc-viewer/test/scout/ui/fixtures/page_objects';
import { StreamsApp } from './streams_app';

export interface StreamsPageObjects extends PageObjects {
  docViewer: DocViewer;
  streams: StreamsApp;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): StreamsPageObjects {
  return {
    ...pageObjects,
    docViewer: createLazyPageObject(DocViewer, page),
    streams: createLazyPageObject(StreamsApp, page),
  };
}
