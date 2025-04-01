/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

import { useEffect } from 'react';
import { Integration } from '@kbn/dataset-quality-plugin/common/data_streams_stats/integration';
import { indexNameToDataStreamParts } from '@kbn/dataset-quality-plugin/common';
import { DATA_QUALITY_LOCATOR_ID, DataQualityLocatorParams } from '@kbn/deeplinks-observability';
import { PLUGIN_NAME } from '../../common';
import { useKibanaContextForPlugin } from './use_kibana';

export const useBreadcrumbs = (breadcrumbs: ChromeBreadcrumb[] = []) => {
  const {
    services: { appParams, chrome, share },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    const locator = share.url.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);

    const composedBreadcrumbs: ChromeBreadcrumb[] = [
      {
        text: PLUGIN_NAME,
        deepLinkId: 'management:data_quality',
        onClick: () => locator?.navigate({}),
      },
      ...breadcrumbs,
    ];

    chrome.docTitle.change(composedBreadcrumbs.at(-1)!.text as string);

    appParams.setBreadcrumbs(composedBreadcrumbs);
  }, [appParams, breadcrumbs, chrome, share]);
};

export const getBreadcrumbValue = (dataStream: string, integration?: Integration) => {
  const { dataset } = indexNameToDataStreamParts(dataStream);
  return integration?.datasets?.[dataset] || dataset;
};
